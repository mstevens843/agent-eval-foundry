// A local simulation adapter, never an agent or a provider. It only writes supplied fixture
// bytes, runs public tools, and exports its workspace through a bounded typed stream.
package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type Config struct {
	Mode    string
	Overlay map[string]string
	Native  bool
	ToolURL string
}
type limitedBuffer struct {
	bytes.Buffer
	overflow bool
}

func (b *limitedBuffer) Write(p []byte) (int, error) {
	n := len(p)
	room := 65536 - b.Len()
	if n > room {
		b.overflow = true
		p = p[:room]
	}
	_, err := b.Buffer.Write(p)
	return n, err
}
func event(t string, fields map[string]any) {
	fields["type"] = t
	if err := json.NewEncoder(os.Stdout).Encode(fields); err != nil {
		panic(err)
	}
}
func checked(err error) {
	if err != nil {
		panic(err)
	}
}
func copyPublic(native bool) {
	checked(filepath.WalkDir("/public", func(path string, e os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel("/public", path)
		if err != nil {
			return err
		}
		dst := filepath.Join("/work/task", rel)
		const nativePrefix = "environment/app/certd"
		if native && (rel == nativePrefix || strings.HasPrefix(rel, nativePrefix+"/")) {
			dst = filepath.Join("/app/certd", strings.TrimPrefix(strings.TrimPrefix(rel, nativePrefix), "/"))
		}
		if e.IsDir() {
			return os.MkdirAll(dst, 0755)
		}
		if !e.Type().IsRegular() {
			return fmt.Errorf("nonregular public input")
		}
		b, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(dst, b, 0644)
	}))
}
func main() {
	var c Config
	checked(json.NewDecoder(io.LimitReader(os.Stdin, 16<<20)).Decode(&c))
	checked(os.MkdirAll("/work/scratch", 0755))
	copyPublic(c.Native)
	event("started", map[string]any{"adapter": "inert-fixture-v1", "evidenceClass": "simulation"})
	event("usage", map[string]any{"usage": map[string]any{"inputTokens": 0, "outputTokens": 0, "costMicroUsd": 0, "source": "simulation-no-provider"}})
	switch c.Mode {
	case "timeout":
		time.Sleep(time.Hour)
	case "interrupted":
		os.Exit(19)
	case "malformed":
		fmt.Println("not a provider event")
		return
	case "large-output":
		for {
			event("diagnostic", map[string]any{"text": strings.Repeat("x", 16384)})
		}
	case "child-process":
		checked(exec.Command("sh", "-c", "sleep 3600 & wait").Run())
	}
	root := "/work/task/public"
	tool := "node"
	args := []string{"--test"}
	if c.Native {
		root = "/app/certd"
		tool = "go"
		args = []string{"test", "./..."}
	}
	for rel, encoded := range c.Overlay {
		if strings.Contains(rel, "..") || filepath.IsAbs(rel) {
			panic("unsafe fixture path")
		}
		b, err := base64.StdEncoding.DecodeString(encoded)
		checked(err)
		checked(os.MkdirAll(filepath.Dir(filepath.Join(root, rel)), 0755))
		checked(os.WriteFile(filepath.Join(root, rel), b, 0644))
	}
	if c.Mode == "missing-file" {
		missing := "entry.mjs"
		if c.Native {
			missing = "internal/authz/planner.go"
		}
		checked(os.Remove(filepath.Join(root, missing)))
	}
	// These are real access/tool checks inside the same authoring boundary, not host-side flags.
	denied := true
	for _, path := range []string{"/tests", "/run/foundry-private", "/Users/devlegacy", "/root/.codex/auth.json", "/var/run/docker.sock", "/foundry-private-canary"} {
		if _, err := os.ReadFile(path); err == nil {
			denied = false
		}
		if _, err := os.ReadDir(path); err == nil {
			denied = false
		}
	}
	for _, name := range []string{"OPENAI_API_KEY", "ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"} {
		if os.Getenv(name) != "" {
			denied = false
		}
	}
	if !denied {
		panic("private context visible")
	}
	cmd := exec.Command(tool, args...)
	cmd.Dir = root
	var output limitedBuffer
	cmd.Stdout = &output
	cmd.Stderr = &output
	err := cmd.Run()
	if output.overflow {
		panic("public tool output limit")
	}
	out := output.Bytes()
	checked(os.WriteFile("/work/scratch/self-check.txt", out, 0644))
	checked(os.WriteFile("/work/scratch/self-check.sh", []byte(tool+" "+strings.Join(args, " ")+"\n"), 0644))
	event("tool", map[string]any{"command": append([]string{tool}, args...), "cwd": root, "success": err == nil, "output": string(out)})
	if c.ToolURL != "" {
		client := http.Client{Timeout: 5 * time.Second}
		response, err := client.Get(c.ToolURL)
		checked(err)
		data, err := io.ReadAll(io.LimitReader(response.Body, 4096))
		checked(err)
		checked(response.Body.Close())
		if response.StatusCode != 200 || string(data) != "foundry-public-tool-ok" {
			panic("allowed tool failed")
		}
		event("external-tool", map[string]any{"status": response.StatusCode, "body": string(data)})
	}
	_, toolErr := exec.LookPath(tool)
	event("isolation", map[string]any{"privateDenied": denied, "uid": os.Getuid(), "publicToolAvailable": toolErr == nil, "selfCheckPassed": err == nil})
	files := 0
	total := 0
	for _, tree := range []struct{ path, kind string }{{root, "submission"}, {"/work/scratch", "workspace"}} {
		checked(filepath.WalkDir(tree.path, func(path string, e os.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if e.IsDir() {
				return nil
			}
			if !e.Type().IsRegular() {
				return fmt.Errorf("nonregular artifact")
			}
			b, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			total += len(b)
			files++
			if total > 8<<20 || files > 128 {
				return fmt.Errorf("artifact quota")
			}
			rel, err := filepath.Rel(tree.path, path)
			if err != nil {
				return err
			}
			for start := 0; start < len(b) || start == 0; start += 16384 {
				end := start + 16384
				if end > len(b) {
					end = len(b)
				}
				event("artifact", map[string]any{"kind": tree.kind, "path": rel, "offset": start, "data": base64.StdEncoding.EncodeToString(b[start:end]), "final": end == len(b)})
			}
			return nil
		}))
	}
	event("completed", map[string]any{"substantive": true, "files": files, "bytes": total})
}
