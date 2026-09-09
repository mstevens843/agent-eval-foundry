package main

import (
	"flag"
	"os"
)

func main() {
	flag.String("store", "", "store path")
	flag.String("order", "", "order path")
	report := flag.String("report", "", "report path")
	audit := flag.String("audit", "", "audit path")
	flag.String("authority", "", "authority socket")
	flag.String("now", "", "evaluation time")
	flag.String("timeout", "10s", "query timeout")
	flag.Parse()
	// Implement the service described by /app/spec/SEMANTICS.md.
	if err := os.WriteFile(*report, []byte("{}\n"), 0600); err != nil {
		panic(err)
	}
	if err := os.WriteFile(*audit, []byte("{}\n"), 0600); err != nil {
		panic(err)
	}
}
