// Package authority talks to the external authorization authority.
package authority

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net"
	"time"

	"certd/internal/order"
)

type query struct {
	Identifier string `json:"identifier"`
}

type response struct {
	Authorization string `json:"authorization,omitempty"`
	Error         string `json:"error,omitempty"`
}

// Client is a client for the authority service.
type Client struct {
	address string
	timeout time.Duration
}

// NewClient returns a client bound to the authority listening on a unix socket.
func NewClient(address string, timeout time.Duration) *Client {
	return &Client{address: address, timeout: timeout}
}

// Query asks the authority for the current authorization of one identifier.
//
// Each call uses its own connection, so callers are not serialised behind a
// shared one.
func (c *Client) Query(identifier string) (order.Authorization, error) {
	conn, err := net.DialTimeout("unix", c.address, c.timeout)
	if err != nil {
		return "", fmt.Errorf("dial: %w", err)
	}
	defer conn.Close()
	if err := conn.SetDeadline(time.Now().Add(c.timeout)); err != nil {
		return "", fmt.Errorf("deadline: %w", err)
	}
	if err := json.NewEncoder(conn).Encode(query{Identifier: identifier}); err != nil {
		return "", fmt.Errorf("write: %w", err)
	}
	var resp response
	if err := json.NewDecoder(bufio.NewReader(conn)).Decode(&resp); err != nil {
		return "", fmt.Errorf("read: %w", err)
	}
	if resp.Error != "" {
		return "", fmt.Errorf("%s", resp.Error)
	}
	switch order.Authorization(resp.Authorization) {
	case order.Permit:
		return order.Permit, nil
	case order.Forbid:
		return order.Forbid, nil
	default:
		return "", fmt.Errorf("unknown authorization %q", resp.Authorization)
	}
}
