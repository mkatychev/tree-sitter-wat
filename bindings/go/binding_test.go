package tree_sitter_wat_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_wat "github.com/mkatychev/tree-sitter-wat/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_wat.Language())
	if language == nil {
		t.Errorf("Error loading WebAssembly Text grammar")
	}
}
