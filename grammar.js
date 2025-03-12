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
    // https://github.com/WebAssembly/component-model/blob/f44d2377f79ea6dd105060f08f01e269cda7df85/design/mvp/Explainer.md#component-definitions
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
    module: $ => seq(
      '(', 'module', optional($.id),
      repeat(choice(
        $.type,
        $.import,
        $.func,
        $.table,
        $.mem,
        $.global,
        $.export,
        $.start,
        $.elem,
        $.data,
    )),
      ')'),
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
    _u32: $ => choice($.num, $.hexnum),
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
    idchar: _ => token.immediate(/[\dA-Za-z!#$%&'*+-./:<=>?@\\^_'|~]+/),
    id: $ => seq('$', $.idchar),

    // Strings denote sequences of bytes that can represent both textual and binary data.
    // They are enclosed in quotation marks and may contain any character other than ASCII45
    // control characters, quotation marks (‘"'), or backslash ('∖'), except when expressed with an escape sequence.
    //
    // string ::= '"' (𝑏*:stringelem)* '"' ⇒ concat((𝑏*)*) (if |concat((𝑏*)*)| < 232)
    // stringelem ::= 𝑐:stringchar ⇒ utf8(𝑐)
    // | '∖’ 𝑛:hexdigit 𝑚:hexdigit ⇒ 16 · 𝑛 + 𝑚
    // char ::= U+00 | . . . | U+D7FF | U+E000 | . . . | U+10FFFF
    escape_sequence: _ => token.immediate(
      seq('\\',
        choice(
          /[^xu]/,
          /[nrt"\\]/,
          /u[0-9a-fA-F]{4}/,
          /u\{[0-9a-fA-F]+\}/,
          /x[0-9a-fA-F]{2}/,
        ),
      )),


    string: $ => seq(
      '"',
      repeat(choice(
        token.immediate(prec(1, /[^"\\]+/)),
        $.escape_sequence,
      )),
      '"',
    ),


    // == Instructions ==
    instr: $ => choice($.plaininstr, $.blockinstr),
    expr: $ => repeat($.instr),

    _label: $ => alias($.idx, $.label),

    plaininstr: $ => choice(
      'unreachable',
      'op',
      seq('br', $.lablelidx),
      seq('br_if', $.lablelidx),
      seq('br_table', repeat($.lablelidx)), // ln labelidx
      'return',
      seq('call' $.funcidx),
      seq('call_indirect', $.tableidx, $.typeuse),
    ),
    // blocktype ::= (t:result)?
    blockinstr: $ => choice(
      $.block
      $.loop,
      $.if_block),
    block: $ => seq(
    'block',
    $._block_inner,
          'end', optional($.id)
    ),
    loop: $ => seq(
    'loop',
    $._block_inner,
          'end', optional($.id)
    ),
    if_block: $ =>
      seq('if', $._block_inner,
        optional('else', optional($.id), repeat($.instr))
          'end', optional($.id)
        ),
    _block_inner: $ => seq($.label, optional(field('blocktype', $.result)), repeat($.instr)),

    // == Modules == //
    idx: $ => choice($._u32, $.id),

    type: $ => seq('(', 'type', optional($.id), $.functype, ')'),
    // TODO $.param* $.result*
    typeuse: $ => choice(
      seq('(', 'type', $.idx, ')', repeat($.param), repeat($.result)),
    ),

    import: $ => seq('(', 'import', field('mod', $.string), field('name', $.string), $.importdesc),
    importdesc: $ => seq('(',
      choice(
        seq('func', optional($.id), $.typeuse),
        seq('table', optional($.id), $.tabletype),
        seq('memory', optional($.id), $.memtype),
        seq('global', optional($.id), $.globaltype),
      ),
      ')',
    ),
    func: $ => seq(
'(',
      'func', optional($.id), $.typeuse, $.local, $.instr
')',
    ),
    local: $ => seq('(', 'local', repeat1($.valtype), ')'),
    table: $ => seq('(', 'table', optinonal($.id), $.tabletype, ')'),
    mem: $ => seq('(', optional($.id), $.memtype, ')'),
    global: $ => seq('(', 'global', optional($.id), $.globaltype, $.expr, ')'),
    // term: $ => seq('(', '<term>', ')'),
    export: $ => seq('(', 'export', field('name', $.string), $.exportdesc, ')'),
    exportdesc: $ => seq('(',
      choice(
        seq('func', $.idx),
        seq('table', $.idx),
        seq('memory', $.idx),
        seq('global', $.idx),
      ),
      ')',
    ),
    start: $ => seq('(', 'start', $.idx ')'),

    elem: $ => seq('(', 'elem', optional($.id),')'),
    elemlist: $ => seq($.reftype, repeat($.elemexpr)),
    elemexpr: $ => seq('(', $.expr, ')'),
    tableuse: $ => seq('(', 'table', $.idx,')'),
    data: $ => seq('(', 'data', optional($.id), $.string, ')'),
    memuse: $ => seq('(', 'memory', $.idx ')'),
  },
});

