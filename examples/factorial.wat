(module
  (type $t0 (func (param i64) (result i64)))
  (func $fac (export "fac") (type $t0) (param $p0 i64) (result i64)
    (if $I0 (result i64)
      (i64.lt_s
        (local.get $p0)
        (i64.const 1))
      (then
        (i64.const 1))
      (else
        (i64.mul
          (local.get $p0)
          (call $fac
            (i64.sub
              (local.get $p0)
              (i64.const 1))))))))

