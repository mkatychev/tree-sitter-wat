/**
 * @file WAT grammar for tree-sitter
 * @author Mikhail Katychev <mkatych@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// WebAssembly Specification, Release 3.0 (Draft 2024-11-07)
// 6.3.4 Names
// Names are strings denoting a literal character sequence. A name string must form a valid UTF-8 encoding as
// defined by Unicode47 (Section 2.5) and is interpreted as a string of Unicode scalar values.
// name ::= 𝑏*:string ⇒ 𝑐* (if 𝑏* = utf8(𝑐*))
// Note: Presuming the source text is itself encoded correctly, strings that do not contain any uses of hexadecimal
// byte escapes are always valid names.
// 6.3.5 Identifiers
// Indices can be given in both numeric and symbolic form. Symbolic identifiers that stand in lieu of indices start with
// '$', followed by eiter a sequence of printable ASCII48 characters that does not contain a space, quotation mark,
// comma, semicolon, or bracket, or by a quoted name.
// id ::= '$' 𝑐*:idchar+                 ⇒ 𝑐*
//      | '$' 𝑐*:name                    ⇒ 𝑐* (if |𝑐*| > 0)
// idchar ::= '0' | . . . | '9'
//          | 'A' | . . . | 'Z'
//          | 'a' | . . . | 'z'
//          | '!' | '#' | '$' | '%' | '&' | '′' | '*' | '+' | '−' | '.' | '/'
//          | ':' | '<' | '=' | '>' | '?' | '@' | '∖' | '^' | '_' | '`' | '|' | '~'
const re_num = /[\d]+(_?\d+)*/;
const re_hexnum = /[\dA-Fa-f]+(_?[\dA-Fa-f]+)*/;
const re_idchar = /[\dA-Za-z!#$%&'*+-./:<=>?@\\^_'|~]+/;
const pattern_sign = new RustRegex('+-');

module.exports = grammar({
  name: "wat",

  extras: $ => [
    /\s/,
    $.comment,
  ],

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => choice($.module, $.component),
    component: $ => seq('(', 'component', ')'),

    // module ::= {  types vec(rectype), ;; functype for now
    //               funcs vec(func),
    //               tables vec(table),
    //               mems vec(mem),
    //               globals vec(global),
    //               tags vec(tag),
    //               elems vec(elem),
    //               datas vec(data),
    //               start start?,
    //               imports vec(import),
    //               exports vec(export) }
    module: $ => seq('(', 'module', repeat(choice(
    $.functype,
    )), ')'),
    functype: $ => seq('(', 'component', ')'),
    // Number Types
    numtype: $ => choice('i32', 'i64', 'f32', 'f64'),
    // Reference Types
    reftype: _ => choice('funcref', 'externref'),
    heaptype: _ => choice('func', 'extern'),
    // Vector Types
    vectype: _ => 'v128',
    // ValueTypes
    valtype: $ => choice($.numtype, $.vectype, $.reftype),

    param: $ => seq('param', optional($.id), $.valtype),

    comment: $ => seq('//', token.immediate(/.*/)),
    id: $ => token.immdeiate(seq('$', re_idchar))
  }
});
