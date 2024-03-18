const assert = require('assert');

const START_SYMBOL = '$';
const OPEN_BRACE = '{';
const CLOSE_BRACE = '}';
const OPEN_PAREN = '(';
const CLOSE_PAREN = ')';
const COMMA = ',';
const QUOTE = '"';
const OPEN_BRACKET = '[';
const CLOSE_BRACKET = ']';


const SYMBOLS = {
  START_SYMBOL,
  OPEN_BRACE,
  CLOSE_BRACE,
  OPEN_PAREN,
  CLOSE_PAREN,
  COMMA,
  QUOTE,
  OPEN_BRACKET,
  CLOSE_BRACKET,
};

class Parser {
  input;
  pos;

  constructor(input) {
    this.input = input;
    this.pos = 0;
  }

  parse() {
    return this.parseFunction();
  }

  parseFunction() {
    this.consumeWhiteSpace();
    if (this.input[this.pos] !== SYMBOLS.START_SYMBOL) {
      throw new Error('expected $ as functuion start symbol');
    }
    this.pos++;
    const functionName = this.parseIdentifier();
    this.consumeWhiteSpace();
    if (this.input[this.pos] !== SYMBOLS.OPEN_PAREN) {
      throw new Error('expected ( after function name');
    }
    this.pos++;
    const args = this.parseArgs();
    this.consumeWhiteSpace();
    if (this.input[this.pos] !== SYMBOLS.CLOSE_PAREN) {
      throw new Error('expected ) after function args');
    }
    this.pos++;
    return { functionName, args };
  }

  parseIdentifier() {
    const start = this.pos;
    while (this.pos < this.input.length && /\w/.test(this.input[this.pos])) {
      this.pos++;
    }
    return this.input.slice(start, this.pos);
  }

  parseArgs() {
    const args = [];
    while ('lianren') {
      this.consumeWhiteSpace();
      if (this.input[this.pos] === SYMBOLS.START_SYMBOL) {
        // parse function
        args.push(this.parseFunction());
      } else if (this.input[this.pos] === SYMBOLS.OPEN_BRACE) {
        // parse json
        const start = this.pos;
        let braceCount = 0;
        let inQuotes = false;
        do {
          if (this.input[this.pos] === SYMBOLS.QUOTE) {
            inQuotes = !inQuotes;
          }
          if (!inQuotes) {
            if (this.input[this.pos] === SYMBOLS.OPEN_BRACE) {
              braceCount++;
            } else if (this.input[this.pos] === SYMBOLS.CLOSE_BRACE) {
              braceCount--;
            }
          }
          this.pos++;
        } while (braceCount > 0 && this.pos < this.input.length);
        args.push(JSON.parse(this.input.slice(start, this.pos)));
      } else if (this.input[this.pos] === SYMBOLS.OPEN_BRACKET) {
        // parse array
        const start = this.pos;
        let bracketCount = 0;
        let inQuotes = false;
        do {
          if (this.input[this.pos] === SYMBOLS.QUOTE) {
            inQuotes = !inQuotes;
          }
          if (!inQuotes) {
            if (this.input[this.pos] === SYMBOLS.OPEN_BRACKET) {
              bracketCount++;
            } else if (this.input[this.pos] === SYMBOLS.CLOSE_BRACKET) {
              bracketCount--;
            }
          }
          this.pos++;
        } while (bracketCount > 0 && this.pos < this.input.length);
        args.push(JSON.parse(this.input.slice(start, this.pos)));
      } else {
        // parse arg
        const start = this.pos;
        while (
          this.pos < this.input.length &&
          this.input[this.pos] !== SYMBOLS.COMMA &&
          this.input[this.pos] !== SYMBOLS.CLOSE_PAREN
        ) {
          this.pos++;
        }
        args.push(this.input.slice(start, this.pos).trim());
      }
      this.consumeWhiteSpace();
      if (this.input[this.pos] === SYMBOLS.COMMA) {
        this.pos++;
      } else {
        break;
      }
    }
    return args;
  }

  consumeWhiteSpace() {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }
}

function testSimpleInputs() {
  const simpleInputs = [
    ['$foo(1, 2, 3)', { functionName: 'foo', args: ['1', '2', '3'] }],
    ['$time(2006-01-02 15:04:05, now)', { functionName: 'time', args: ['2006-01-02 15:04:05', 'now'] }],
    ['$foo({"a":"1","b":2},"a")', { functionName: 'foo', args: [{ a: '1', b: 2 }, '"a"'] }],
  ];
  simpleInputs.forEach(([input, expected]) => {
    const parsed = new Parser(input);
    const actual = parsed.parse();
    assert.deepStrictEqual(actual, expected);
  });
}

function testComplexInputs() {
  const complexInputs = [
    ['$foo({},{"}":2})', { functionName: 'foo', args: [{}, { '}': 2 }] }],
    ['$foo($bar(1, 2), $baz(3, 4))', { functionName: 'foo', args: [{ functionName: 'bar', args: ['1', '2'] }, { functionName: 'baz', args: ['3', '4'] }] }],
    ['$foo({"a,c,":{"[[]d":",,.)"},"b":2},"a")', { functionName: 'foo', args: [{ 'a,c,': { '[[]d': ',,.)' }, b: 2 }, '"a"'] }],
    ['$foo($bar(1, $baz(2, 3)), $qux(4, 5))', { functionName: 'foo', args: [{ functionName: 'bar', args: ['1', { functionName: 'baz', args: ['2', '3'] }] }, { functionName: 'qux', args: ['4', '5'] }] }],
    ['$foo($bar("a", "b"), $baz({"c": 1, "d": 2}, [3, 4]))', { functionName: 'foo', args: [{ functionName: 'bar', args: ['"a"', '"b"'] }, { functionName: 'baz', args: [{ c: 1, d: 2 }, [3, 4]] }] }],
    ['$foo($bar($baz($qux(1, 2), 3), 4), 5)', { functionName: 'foo', args: [{ functionName: 'bar', args: [{ functionName: 'baz', args: [{ functionName: 'qux', args: ['1', '2'] }, '3'] }, '4'] }, '5'] }],
    ['$foo({"a": "$bar(1, 2)", "b": "$baz(3, 4)"}, "c")', { "functionName": "foo", "args": [{ "a": "$bar(1, 2)", "b": "$baz(3, 4)" }, "\"c\""] }],
    ['$foo($bar({"a": 1, "b": 2}, [3, 4]), "c")', { "functionName": "foo", "args": [{ "functionName": "bar", "args": [{ "a": 1, "b": 2 }, [3, 4]] }, "\"c\""] }],
    ['$foo($bar({"a": 1, "b": 2}, [3, 4]), "c")', { "functionName": "foo", "args": [{ "functionName": "bar", "args": [{ "a": 1, "b": 2 }, [3, 4]] }, "\"c\""] }]
  ];

  complexInputs.forEach(([input, expected]) => {
    const parsed = new Parser(input);
    const actual = parsed.parse();
    assert.deepStrictEqual(actual, expected);
  });

}

testSimpleInputs();
testComplexInputs();
