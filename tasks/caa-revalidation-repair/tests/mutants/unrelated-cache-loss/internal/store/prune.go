package store

// An over-eager cleanup retains only identifiers used by this order.
func (s *Store) Prune(names []string) {
	keep := make(map[string]bool)
	for _, name := range names { keep[name] = true }
	for name := range s.doc.Authorizations { if !keep[name] { delete(s.doc.Authorizations, name) } }
}
