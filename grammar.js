/**
 * @file WAT grammar for tree-sitter
 * @author Mikhail Katychev <mkatych@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

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
  name: 'wat',

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
    // Number Types
    numtype: $ => choice('i32', 'i64', 'f32', 'f64'),

    // Reference Types
    reftype: _ => choice('funcref', 'externref'),
    heaptype: _ => choice('func', 'extern'),

    // Vector Types
    vectype: _ => 'v128',

    // Value Types
    valtype: $ => choice($.numtype, $.vectype, $.reftype),

    // Function Types
    functype: $ => seq('(', 'func', repeat($.param), repeat($.result), ')'),

    // `(param i32 f64)` is equivalent to `(param i32) (param f64)`.
    param: $ => seq('param', optional($.id), $.valtype),
    result: $ => seq('result', $.valtype),

    // Layout Types
    // limits ::= 𝑛:u32 ⇒ {min 𝑛, max 𝜖}
    //          | 𝑛:u32 𝑚:u32 ⇒ {min 𝑛, max 𝑚}
    limits: $ => seq($.num, optional($.num)),

    memtype: $ => $.limits,
    tabletype: $ => seq($.limits, $.reftype),
    globaltype: $ => choice($.valtype, seq('(', 'mut', $.valtype, ')')),

    comment: $ => seq('//', token.immediate(/.*/)),


    // == Values == //
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
    num: _ => token(/[\d]+(_?\d+)*/),
    hexnum: _ => token(/[\dA-Fa-f]+(_?[\dA-Fa-f]+)*/),
    idchar: _ => token.immediate(/[\dA-Za-z!#$%&'*+-./:<=>?@\\^_'|~]+/),
    id: $ => seq('$', $.idchar),


    // == Instructions ==
    instr: $ => choice($.plaininstr, $.blockinstr),

    plaininstr: $ => choice(
      'unreachable,
      'op',
      seq('br', $.lablelidx),
      seq('br_if', $.lablelidx),
      seq('br_table', repeat($.lablelidx)), // ln labelidx
      'return'
      seq('call' $.funcidx)
      seq('call_indirect', $.tableidx, $.typeuse),
    ),
  },
});

