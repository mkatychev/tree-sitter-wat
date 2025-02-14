import XCTest
import SwiftTreeSitter
import TreeSitterWat

final class TreeSitterWatTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_wat())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading WebAssembly Text grammar")
    }
}
