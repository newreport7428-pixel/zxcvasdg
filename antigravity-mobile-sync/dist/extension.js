"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/@marijn/find-cluster-break/dist/index.cjs
var require_dist = __commonJS({
  "node_modules/@marijn/find-cluster-break/dist/index.cjs"(exports2) {
    "use strict";
    var rangeFrom = [];
    var rangeTo = [];
    (() => {
      let numbers = "lc,34,7n,7,7b,19,,,,2,,2,,,20,b,1c,l,g,,2t,7,2,6,2,2,,4,z,,u,r,2j,b,1m,9,9,,o,4,,9,,3,,5,17,3,1n,9,16,o,,x,1i,3,,i,,7,a,2,t,3,1k,,,7,2,2,2,3,9,,a,2,q,,2,3,1k,,,5,4,2,2,3,3,,u,2,3,,b,3,1k,,,8,,3,,3,k,2,m,6,,3,1k,,,7,2,2,2,3,7,3,a,2,u,,1n,5,3,3,,4,9,,14,5,1j,,,7,,3,,4,7,2,b,2,t,3,1k,,,7,,3,,4,7,2,b,2,f,,c,4,1j,2,,7,,3,,4,9,,a,2,t,3,1y,,4,6,,,,8,i,2,1p,,,8,c,8,2q,,,a,b,7,21,2,r,,,,,,4,2,1d,k,,2,5,b,,10,9,,2u,b,,6,n,4,4,3,g,4,d,,,3,6,,f,,jj,3,qa,4,s,3,t,2,u,2,1s,w,9,,19,3,,,39,2,y,,3a,c,4,c,63,5,1l,a,,,,,2,o,2,,1c,1a,2,c,k,5,1b,h,12,9,c,3,u,d,1k,e,1c,k,48,3,,l,4,,6,,2,3,5i,1s,ek,,5f,x,2da,3,3x,,2o,w,fe,6,2x,2,n9w,4,,a,w,2,28,2,7k,,3,,4,,n,5,4,,2b,2,1e,i,q,i,d,,12,8,p,d,18,4,1b,e,10,,1v,e,c,,8,2,1a,,1f,,,3,2,2,5,2,,,15,5,5,2,6k,8,,2,fn4,,kh,g,g,g,a6,2,gt,,6a,,45,5,1ae,3,,2,5,4,14,3,4,,4l,2,fx,4,1t,5,8t,2,25,6,1y,b,1d,4,3e,3,1h,f,15,,2,2,a,4,19,b,7,,1p,3,10,e,g,2,18,,c,3,1c,e,8,4,,2,2k,c,6,,2,,4d,c,l,4,1j,2,,7,2,2,2,3,9,,a,2,2,7,3,5,1v,9,,,2,,,4,,5,,,e,2,2a,i,n,,29,k,6j,7,2,9,r,2,2a,h,2y,d,2t,3,2,a,74,f,6t,6,,2,2,4,,,,2,3x,7,2,7,3,,s,a,14,7,,4,8,,9,b,1a,g,5i,8,5j,8,,8,2a,m,,e,3e,6,3,,,2,,7,,,1u,5,,2,,5,9n,4,9,2,,,1c,7,3,5,n,,44l,,6,f,8ug,i,1xc,5,1n,7,t4,,,1j,7,4,29,,b,2,f57,2,3mp,1a,2,n,f2,5,3,6,8,8,2,7,u,4,44,3,1iz,1j,4,1e,8,,e,,m,5,,f,11s,7,,h,2,7,,2,,5,2s,,4g,7,af,,1p,4,e4,4,72,2,6r,,2,,7,2,5,,d6,7,31,7,240,5".split(",").map((s) => s ? parseInt(s, 36) : 1);
      for (let i = 0, n = 0; i < numbers.length; i++)
        (i % 2 ? rangeTo : rangeFrom).push(n = n + numbers[i]);
    })();
    function isExtendingChar(code) {
      if (code < 768) return false;
      for (let from = 0, to = rangeFrom.length; ; ) {
        let mid = from + to >> 1;
        if (code < rangeFrom[mid]) to = mid;
        else if (code >= rangeTo[mid]) from = mid + 1;
        else return true;
        if (from == to) return false;
      }
    }
    function isRegionalIndicator(code) {
      return code >= 127462 && code <= 127487;
    }
    var ZWJ = 8205;
    function findClusterBreak(str, pos, forward = true, includeExtending = true) {
      return (forward ? nextClusterBreak : prevClusterBreak)(str, pos, includeExtending);
    }
    function nextClusterBreak(str, pos, includeExtending) {
      if (pos == str.length) return pos;
      if (pos && surrogateLow(str.charCodeAt(pos)) && surrogateHigh(str.charCodeAt(pos - 1))) pos--;
      let prev = codePointAt(str, pos);
      pos += codePointSize(prev);
      while (pos < str.length) {
        let next = codePointAt(str, pos);
        if (prev == ZWJ || next == ZWJ || includeExtending && isExtendingChar(next)) {
          pos += codePointSize(next);
          prev = next;
        } else if (isRegionalIndicator(next)) {
          let countBefore = 0, i = pos - 2;
          while (i >= 0 && isRegionalIndicator(codePointAt(str, i))) {
            countBefore++;
            i -= 2;
          }
          if (countBefore % 2 == 0) break;
          else pos += 2;
        } else {
          break;
        }
      }
      return pos;
    }
    function prevClusterBreak(str, pos, includeExtending) {
      while (pos > 1) {
        let found = nextClusterBreak(str, pos - 2, includeExtending);
        if (found < pos) return found;
        pos--;
      }
      return 0;
    }
    function codePointAt(str, pos) {
      let code0 = str.charCodeAt(pos);
      if (!surrogateHigh(code0) || pos + 1 == str.length) return code0;
      let code1 = str.charCodeAt(pos + 1);
      if (!surrogateLow(code1)) return code0;
      return (code0 - 55296 << 10) + (code1 - 56320) + 65536;
    }
    function surrogateLow(ch) {
      return ch >= 56320 && ch < 57344;
    }
    function surrogateHigh(ch) {
      return ch >= 55296 && ch < 56320;
    }
    function codePointSize(code) {
      return code < 65536 ? 1 : 2;
    }
    exports2.findClusterBreak = findClusterBreak;
    exports2.isExtendingChar = isExtendingChar;
  }
});

// node_modules/@codemirror/state/dist/index.cjs
var require_dist2 = __commonJS({
  "node_modules/@codemirror/state/dist/index.cjs"(exports2) {
    "use strict";
    var findClusterBreak$1 = require_dist();
    var Text = class _Text {
      /**
      Get the line description around the given position.
      */
      lineAt(pos) {
        if (pos < 0 || pos > this.length)
          throw new RangeError(`Invalid position ${pos} in document of length ${this.length}`);
        return this.lineInner(pos, false, 1, 0);
      }
      /**
      Get the description for the given (1-based) line number.
      */
      line(n) {
        if (n < 1 || n > this.lines)
          throw new RangeError(`Invalid line number ${n} in ${this.lines}-line document`);
        return this.lineInner(n, true, 1, 0);
      }
      /**
      Replace a range of the text with the given content.
      */
      replace(from, to, text) {
        [from, to] = clip(this, from, to);
        let parts = [];
        this.decompose(
          0,
          from,
          parts,
          2
          /* Open.To */
        );
        if (text.length)
          text.decompose(
            0,
            text.length,
            parts,
            1 | 2
            /* Open.To */
          );
        this.decompose(
          to,
          this.length,
          parts,
          1
          /* Open.From */
        );
        return TextNode.from(parts, this.length - (to - from) + text.length);
      }
      /**
      Append another document to this one.
      */
      append(other) {
        return this.replace(this.length, this.length, other);
      }
      /**
      Retrieve the text between the given points.
      */
      slice(from, to = this.length) {
        [from, to] = clip(this, from, to);
        let parts = [];
        this.decompose(from, to, parts, 0);
        return TextNode.from(parts, to - from);
      }
      /**
      Test whether this text is equal to another instance.
      */
      eq(other) {
        if (other == this)
          return true;
        if (other.length != this.length || other.lines != this.lines)
          return false;
        let start2 = this.scanIdentical(other, 1), end = this.length - this.scanIdentical(other, -1);
        let a = new RawTextCursor(this), b = new RawTextCursor(other);
        for (let skip = start2, pos = start2; ; ) {
          a.next(skip);
          b.next(skip);
          skip = 0;
          if (a.lineBreak != b.lineBreak || a.done != b.done || a.value != b.value)
            return false;
          pos += a.value.length;
          if (a.done || pos >= end)
            return true;
        }
      }
      /**
      Iterate over the text. When `dir` is `-1`, iteration happens
      from end to start. This will return lines and the breaks between
      them as separate strings.
      */
      iter(dir = 1) {
        return new RawTextCursor(this, dir);
      }
      /**
      Iterate over a range of the text. When `from` > `to`, the
      iterator will run in reverse.
      */
      iterRange(from, to = this.length) {
        return new PartialTextCursor(this, from, to);
      }
      /**
      Return a cursor that iterates over the given range of lines,
      _without_ returning the line breaks between, and yielding empty
      strings for empty lines.
      
      When `from` and `to` are given, they should be 1-based line numbers.
      */
      iterLines(from, to) {
        let inner;
        if (from == null) {
          inner = this.iter();
        } else {
          if (to == null)
            to = this.lines + 1;
          let start2 = this.line(from).from;
          inner = this.iterRange(start2, Math.max(start2, to == this.lines + 1 ? this.length : to <= 1 ? 0 : this.line(to - 1).to));
        }
        return new LineCursor(inner);
      }
      /**
      Return the document as a string, using newline characters to
      separate lines.
      */
      toString() {
        return this.sliceString(0);
      }
      /**
      Convert the document to an array of lines (which can be
      deserialized again via [`Text.of`](https://codemirror.net/6/docs/ref/#state.Text^of)).
      */
      toJSON() {
        let lines = [];
        this.flatten(lines);
        return lines;
      }
      /**
      @internal
      */
      constructor() {
      }
      /**
      Create a `Text` instance for the given array of lines.
      */
      static of(text) {
        if (text.length == 0)
          throw new RangeError("A document must have at least one line");
        if (text.length == 1 && !text[0])
          return _Text.empty;
        return text.length <= 32 ? new TextLeaf(text) : TextNode.from(TextLeaf.split(text, []));
      }
    };
    var TextLeaf = class _TextLeaf extends Text {
      constructor(text, length = textLength(text)) {
        super();
        this.text = text;
        this.length = length;
      }
      get lines() {
        return this.text.length;
      }
      get children() {
        return null;
      }
      lineInner(target, isLine, line, offset) {
        for (let i = 0; ; i++) {
          let string = this.text[i], end = offset + string.length;
          if ((isLine ? line : end) >= target)
            return new Line(offset, end, line, string);
          offset = end + 1;
          line++;
        }
      }
      decompose(from, to, target, open) {
        let text = from <= 0 && to >= this.length ? this : new _TextLeaf(sliceText(this.text, from, to), Math.min(to, this.length) - Math.max(0, from));
        if (open & 1) {
          let prev = target.pop();
          let joined = appendText(text.text, prev.text.slice(), 0, text.length);
          if (joined.length <= 32) {
            target.push(new _TextLeaf(joined, prev.length + text.length));
          } else {
            let mid = joined.length >> 1;
            target.push(new _TextLeaf(joined.slice(0, mid)), new _TextLeaf(joined.slice(mid)));
          }
        } else {
          target.push(text);
        }
      }
      replace(from, to, text) {
        if (!(text instanceof _TextLeaf))
          return super.replace(from, to, text);
        [from, to] = clip(this, from, to);
        let lines = appendText(this.text, appendText(text.text, sliceText(this.text, 0, from)), to);
        let newLen = this.length + text.length - (to - from);
        if (lines.length <= 32)
          return new _TextLeaf(lines, newLen);
        return TextNode.from(_TextLeaf.split(lines, []), newLen);
      }
      sliceString(from, to = this.length, lineSep = "\n") {
        [from, to] = clip(this, from, to);
        let result = "";
        for (let pos = 0, i = 0; pos <= to && i < this.text.length; i++) {
          let line = this.text[i], end = pos + line.length;
          if (pos > from && i)
            result += lineSep;
          if (from < end && to > pos)
            result += line.slice(Math.max(0, from - pos), to - pos);
          pos = end + 1;
        }
        return result;
      }
      flatten(target) {
        for (let line of this.text)
          target.push(line);
      }
      scanIdentical() {
        return 0;
      }
      static split(text, target) {
        let part = [], len = -1;
        for (let line of text) {
          part.push(line);
          len += line.length + 1;
          if (part.length == 32) {
            target.push(new _TextLeaf(part, len));
            part = [];
            len = -1;
          }
        }
        if (len > -1)
          target.push(new _TextLeaf(part, len));
        return target;
      }
    };
    var TextNode = class _TextNode extends Text {
      constructor(children, length) {
        super();
        this.children = children;
        this.length = length;
        this.lines = 0;
        for (let child of children)
          this.lines += child.lines;
      }
      lineInner(target, isLine, line, offset) {
        for (let i = 0; ; i++) {
          let child = this.children[i], end = offset + child.length, endLine = line + child.lines - 1;
          if ((isLine ? endLine : end) >= target)
            return child.lineInner(target, isLine, line, offset);
          offset = end + 1;
          line = endLine + 1;
        }
      }
      decompose(from, to, target, open) {
        for (let i = 0, pos = 0; pos <= to && i < this.children.length; i++) {
          let child = this.children[i], end = pos + child.length;
          if (from <= end && to >= pos) {
            let childOpen = open & ((pos <= from ? 1 : 0) | (end >= to ? 2 : 0));
            if (pos >= from && end <= to && !childOpen)
              target.push(child);
            else
              child.decompose(from - pos, to - pos, target, childOpen);
          }
          pos = end + 1;
        }
      }
      replace(from, to, text) {
        [from, to] = clip(this, from, to);
        if (text.lines < this.lines)
          for (let i = 0, pos = 0; i < this.children.length; i++) {
            let child = this.children[i], end = pos + child.length;
            if (from >= pos && to <= end) {
              let updated = child.replace(from - pos, to - pos, text);
              let totalLines = this.lines - child.lines + updated.lines;
              if (updated.lines < totalLines >> 5 - 1 && updated.lines > totalLines >> 5 + 1) {
                let copy = this.children.slice();
                copy[i] = updated;
                return new _TextNode(copy, this.length - (to - from) + text.length);
              }
              return super.replace(pos, end, updated);
            }
            pos = end + 1;
          }
        return super.replace(from, to, text);
      }
      sliceString(from, to = this.length, lineSep = "\n") {
        [from, to] = clip(this, from, to);
        let result = "";
        for (let i = 0, pos = 0; i < this.children.length && pos <= to; i++) {
          let child = this.children[i], end = pos + child.length;
          if (pos > from && i)
            result += lineSep;
          if (from < end && to > pos)
            result += child.sliceString(from - pos, to - pos, lineSep);
          pos = end + 1;
        }
        return result;
      }
      flatten(target) {
        for (let child of this.children)
          child.flatten(target);
      }
      scanIdentical(other, dir) {
        if (!(other instanceof _TextNode))
          return 0;
        let length = 0;
        let [iA, iB, eA, eB] = dir > 0 ? [0, 0, this.children.length, other.children.length] : [this.children.length - 1, other.children.length - 1, -1, -1];
        for (; ; iA += dir, iB += dir) {
          if (iA == eA || iB == eB)
            return length;
          let chA = this.children[iA], chB = other.children[iB];
          if (chA != chB)
            return length + chA.scanIdentical(chB, dir);
          length += chA.length + 1;
        }
      }
      static from(children, length = children.reduce((l, ch) => l + ch.length + 1, -1)) {
        let lines = 0;
        for (let ch of children)
          lines += ch.lines;
        if (lines < 32) {
          let flat = [];
          for (let ch of children)
            ch.flatten(flat);
          return new TextLeaf(flat, length);
        }
        let chunk = Math.max(
          32,
          lines >> 5
          /* Tree.BranchShift */
        ), maxChunk = chunk << 1, minChunk = chunk >> 1;
        let chunked = [], currentLines = 0, currentLen = -1, currentChunk = [];
        function add(child) {
          let last2;
          if (child.lines > maxChunk && child instanceof _TextNode) {
            for (let node of child.children)
              add(node);
          } else if (child.lines > minChunk && (currentLines > minChunk || !currentLines)) {
            flush();
            chunked.push(child);
          } else if (child instanceof TextLeaf && currentLines && (last2 = currentChunk[currentChunk.length - 1]) instanceof TextLeaf && child.lines + last2.lines <= 32) {
            currentLines += child.lines;
            currentLen += child.length + 1;
            currentChunk[currentChunk.length - 1] = new TextLeaf(last2.text.concat(child.text), last2.length + 1 + child.length);
          } else {
            if (currentLines + child.lines > chunk)
              flush();
            currentLines += child.lines;
            currentLen += child.length + 1;
            currentChunk.push(child);
          }
        }
        function flush() {
          if (currentLines == 0)
            return;
          chunked.push(currentChunk.length == 1 ? currentChunk[0] : _TextNode.from(currentChunk, currentLen));
          currentLen = -1;
          currentLines = currentChunk.length = 0;
        }
        for (let child of children)
          add(child);
        flush();
        return chunked.length == 1 ? chunked[0] : new _TextNode(chunked, length);
      }
    };
    Text.empty = new TextLeaf([""], 0);
    function textLength(text) {
      let length = -1;
      for (let line of text)
        length += line.length + 1;
      return length;
    }
    function appendText(text, target, from = 0, to = 1e9) {
      for (let pos = 0, i = 0, first = true; i < text.length && pos <= to; i++) {
        let line = text[i], end = pos + line.length;
        if (end >= from) {
          if (end > to)
            line = line.slice(0, to - pos);
          if (pos < from)
            line = line.slice(from - pos);
          if (first) {
            target[target.length - 1] += line;
            first = false;
          } else
            target.push(line);
        }
        pos = end + 1;
      }
      return target;
    }
    function sliceText(text, from, to) {
      return appendText(text, [""], from, to);
    }
    var RawTextCursor = class {
      constructor(text, dir = 1) {
        this.dir = dir;
        this.done = false;
        this.lineBreak = false;
        this.value = "";
        this.nodes = [text];
        this.offsets = [dir > 0 ? 1 : (text instanceof TextLeaf ? text.text.length : text.children.length) << 1];
      }
      nextInner(skip, dir) {
        this.done = this.lineBreak = false;
        for (; ; ) {
          let last2 = this.nodes.length - 1;
          let top = this.nodes[last2], offsetValue = this.offsets[last2], offset = offsetValue >> 1;
          let size = top instanceof TextLeaf ? top.text.length : top.children.length;
          if (offset == (dir > 0 ? size : 0)) {
            if (last2 == 0) {
              this.done = true;
              this.value = "";
              return this;
            }
            if (dir > 0)
              this.offsets[last2 - 1]++;
            this.nodes.pop();
            this.offsets.pop();
          } else if ((offsetValue & 1) == (dir > 0 ? 0 : 1)) {
            this.offsets[last2] += dir;
            if (skip == 0) {
              this.lineBreak = true;
              this.value = "\n";
              return this;
            }
            skip--;
          } else if (top instanceof TextLeaf) {
            let next = top.text[offset + (dir < 0 ? -1 : 0)];
            this.offsets[last2] += dir;
            if (next.length > Math.max(0, skip)) {
              this.value = skip == 0 ? next : dir > 0 ? next.slice(skip) : next.slice(0, next.length - skip);
              return this;
            }
            skip -= next.length;
          } else {
            let next = top.children[offset + (dir < 0 ? -1 : 0)];
            if (skip > next.length) {
              skip -= next.length;
              this.offsets[last2] += dir;
            } else {
              if (dir < 0)
                this.offsets[last2]--;
              this.nodes.push(next);
              this.offsets.push(dir > 0 ? 1 : (next instanceof TextLeaf ? next.text.length : next.children.length) << 1);
            }
          }
        }
      }
      next(skip = 0) {
        if (skip < 0) {
          this.nextInner(-skip, -this.dir);
          skip = this.value.length;
        }
        return this.nextInner(skip, this.dir);
      }
    };
    var PartialTextCursor = class {
      constructor(text, start2, end) {
        this.value = "";
        this.done = false;
        this.cursor = new RawTextCursor(text, start2 > end ? -1 : 1);
        this.pos = start2 > end ? text.length : 0;
        this.from = Math.min(start2, end);
        this.to = Math.max(start2, end);
      }
      nextInner(skip, dir) {
        if (dir < 0 ? this.pos <= this.from : this.pos >= this.to) {
          this.value = "";
          this.done = true;
          return this;
        }
        skip += Math.max(0, dir < 0 ? this.pos - this.to : this.from - this.pos);
        let limit = dir < 0 ? this.pos - this.from : this.to - this.pos;
        if (skip > limit)
          skip = limit;
        limit -= skip;
        let { value } = this.cursor.next(skip);
        this.pos += (value.length + skip) * dir;
        this.value = value.length <= limit ? value : dir < 0 ? value.slice(value.length - limit) : value.slice(0, limit);
        this.done = !this.value;
        return this;
      }
      next(skip = 0) {
        if (skip < 0)
          skip = Math.max(skip, this.from - this.pos);
        else if (skip > 0)
          skip = Math.min(skip, this.to - this.pos);
        return this.nextInner(skip, this.cursor.dir);
      }
      get lineBreak() {
        return this.cursor.lineBreak && this.value != "";
      }
    };
    var LineCursor = class {
      constructor(inner) {
        this.inner = inner;
        this.afterBreak = true;
        this.value = "";
        this.done = false;
      }
      next(skip = 0) {
        let { done, lineBreak, value } = this.inner.next(skip);
        if (done && this.afterBreak) {
          this.value = "";
          this.afterBreak = false;
        } else if (done) {
          this.done = true;
          this.value = "";
        } else if (lineBreak) {
          if (this.afterBreak) {
            this.value = "";
          } else {
            this.afterBreak = true;
            this.next();
          }
        } else {
          this.value = value;
          this.afterBreak = false;
        }
        return this;
      }
      get lineBreak() {
        return false;
      }
    };
    if (typeof Symbol != "undefined") {
      Text.prototype[Symbol.iterator] = function() {
        return this.iter();
      };
      RawTextCursor.prototype[Symbol.iterator] = PartialTextCursor.prototype[Symbol.iterator] = LineCursor.prototype[Symbol.iterator] = function() {
        return this;
      };
    }
    var Line = class {
      /**
      @internal
      */
      constructor(from, to, number, text) {
        this.from = from;
        this.to = to;
        this.number = number;
        this.text = text;
      }
      /**
      The length of the line (not including any line break after it).
      */
      get length() {
        return this.to - this.from;
      }
    };
    function clip(text, from, to) {
      from = Math.max(0, Math.min(text.length, from));
      return [from, Math.max(from, Math.min(text.length, to))];
    }
    function findClusterBreak(str, pos, forward = true, includeExtending = true) {
      return findClusterBreak$1.findClusterBreak(str, pos, forward, includeExtending);
    }
    function surrogateLow(ch) {
      return ch >= 56320 && ch < 57344;
    }
    function surrogateHigh(ch) {
      return ch >= 55296 && ch < 56320;
    }
    function codePointAt(str, pos) {
      let code0 = str.charCodeAt(pos);
      if (!surrogateHigh(code0) || pos + 1 == str.length)
        return code0;
      let code1 = str.charCodeAt(pos + 1);
      if (!surrogateLow(code1))
        return code0;
      return (code0 - 55296 << 10) + (code1 - 56320) + 65536;
    }
    function fromCodePoint(code) {
      if (code <= 65535)
        return String.fromCharCode(code);
      code -= 65536;
      return String.fromCharCode((code >> 10) + 55296, (code & 1023) + 56320);
    }
    function codePointSize(code) {
      return code < 65536 ? 1 : 2;
    }
    var DefaultSplit = /\r\n?|\n/;
    exports2.MapMode = void 0;
    (function(MapMode) {
      MapMode[MapMode["Simple"] = 0] = "Simple";
      MapMode[MapMode["TrackDel"] = 1] = "TrackDel";
      MapMode[MapMode["TrackBefore"] = 2] = "TrackBefore";
      MapMode[MapMode["TrackAfter"] = 3] = "TrackAfter";
    })(exports2.MapMode || (exports2.MapMode = {}));
    var ChangeDesc = class _ChangeDesc {
      // Sections are encoded as pairs of integers. The first is the
      // length in the current document, and the second is -1 for
      // unaffected sections, and the length of the replacement content
      // otherwise. So an insertion would be (0, n>0), a deletion (n>0,
      // 0), and a replacement two positive numbers.
      /**
      @internal
      */
      constructor(sections) {
        this.sections = sections;
      }
      /**
      The length of the document before the change.
      */
      get length() {
        let result = 0;
        for (let i = 0; i < this.sections.length; i += 2)
          result += this.sections[i];
        return result;
      }
      /**
      The length of the document after the change.
      */
      get newLength() {
        let result = 0;
        for (let i = 0; i < this.sections.length; i += 2) {
          let ins = this.sections[i + 1];
          result += ins < 0 ? this.sections[i] : ins;
        }
        return result;
      }
      /**
      False when there are actual changes in this set.
      */
      get empty() {
        return this.sections.length == 0 || this.sections.length == 2 && this.sections[1] < 0;
      }
      /**
      Iterate over the unchanged parts left by these changes. `posA`
      provides the position of the range in the old document, `posB`
      the new position in the changed document.
      */
      iterGaps(f) {
        for (let i = 0, posA = 0, posB = 0; i < this.sections.length; ) {
          let len = this.sections[i++], ins = this.sections[i++];
          if (ins < 0) {
            f(posA, posB, len);
            posB += len;
          } else {
            posB += ins;
          }
          posA += len;
        }
      }
      /**
      Iterate over the ranges changed by these changes. (See
      [`ChangeSet.iterChanges`](https://codemirror.net/6/docs/ref/#state.ChangeSet.iterChanges) for a
      variant that also provides you with the inserted text.)
      `fromA`/`toA` provides the extent of the change in the starting
      document, `fromB`/`toB` the extent of the replacement in the
      changed document.
      
      When `individual` is true, adjacent changes (which are kept
      separate for [position mapping](https://codemirror.net/6/docs/ref/#state.ChangeDesc.mapPos)) are
      reported separately.
      */
      iterChangedRanges(f, individual = false) {
        iterChanges(this, f, individual);
      }
      /**
      Get a description of the inverted form of these changes.
      */
      get invertedDesc() {
        let sections = [];
        for (let i = 0; i < this.sections.length; ) {
          let len = this.sections[i++], ins = this.sections[i++];
          if (ins < 0)
            sections.push(len, ins);
          else
            sections.push(ins, len);
        }
        return new _ChangeDesc(sections);
      }
      /**
      Compute the combined effect of applying another set of changes
      after this one. The length of the document after this set should
      match the length before `other`.
      */
      composeDesc(other) {
        return this.empty ? other : other.empty ? this : composeSets(this, other);
      }
      /**
      Map this description, which should start with the same document
      as `other`, over another set of changes, so that it can be
      applied after it. When `before` is true, map as if the changes
      in `this` happened before the ones in `other`.
      */
      mapDesc(other, before = false) {
        return other.empty ? this : mapSet(this, other, before);
      }
      mapPos(pos, assoc = -1, mode = exports2.MapMode.Simple) {
        let posA = 0, posB = 0;
        for (let i = 0; i < this.sections.length; ) {
          let len = this.sections[i++], ins = this.sections[i++], endA = posA + len;
          if (ins < 0) {
            if (endA > pos)
              return posB + (pos - posA);
            posB += len;
          } else {
            if (mode != exports2.MapMode.Simple && endA >= pos && (mode == exports2.MapMode.TrackDel && posA < pos && endA > pos || mode == exports2.MapMode.TrackBefore && posA < pos || mode == exports2.MapMode.TrackAfter && endA > pos))
              return null;
            if (endA > pos || endA == pos && assoc < 0 && !len)
              return pos == posA || assoc < 0 ? posB : posB + ins;
            posB += ins;
          }
          posA = endA;
        }
        if (pos > posA)
          throw new RangeError(`Position ${pos} is out of range for changeset of length ${posA}`);
        return posB;
      }
      /**
      Check whether these changes touch a given range. When one of the
      changes entirely covers the range, the string `"cover"` is
      returned.
      */
      touchesRange(from, to = from) {
        for (let i = 0, pos = 0; i < this.sections.length && pos <= to; ) {
          let len = this.sections[i++], ins = this.sections[i++], end = pos + len;
          if (ins >= 0 && pos <= to && end >= from)
            return pos < from && end > to ? "cover" : true;
          pos = end;
        }
        return false;
      }
      /**
      @internal
      */
      toString() {
        let result = "";
        for (let i = 0; i < this.sections.length; ) {
          let len = this.sections[i++], ins = this.sections[i++];
          result += (result ? " " : "") + len + (ins >= 0 ? ":" + ins : "");
        }
        return result;
      }
      /**
      Serialize this change desc to a JSON-representable value.
      */
      toJSON() {
        return this.sections;
      }
      /**
      Create a change desc from its JSON representation (as produced
      by [`toJSON`](https://codemirror.net/6/docs/ref/#state.ChangeDesc.toJSON).
      */
      static fromJSON(json) {
        if (!Array.isArray(json) || json.length % 2 || json.some((a) => typeof a != "number"))
          throw new RangeError("Invalid JSON representation of ChangeDesc");
        return new _ChangeDesc(json);
      }
      /**
      @internal
      */
      static create(sections) {
        return new _ChangeDesc(sections);
      }
    };
    var ChangeSet = class _ChangeSet extends ChangeDesc {
      constructor(sections, inserted) {
        super(sections);
        this.inserted = inserted;
      }
      /**
      Apply the changes to a document, returning the modified
      document.
      */
      apply(doc) {
        if (this.length != doc.length)
          throw new RangeError("Applying change set to a document with the wrong length");
        iterChanges(this, (fromA, toA, fromB, _toB, text) => doc = doc.replace(fromB, fromB + (toA - fromA), text), false);
        return doc;
      }
      mapDesc(other, before = false) {
        return mapSet(this, other, before, true);
      }
      /**
      Given the document as it existed _before_ the changes, return a
      change set that represents the inverse of this set, which could
      be used to go from the document created by the changes back to
      the document as it existed before the changes.
      */
      invert(doc) {
        let sections = this.sections.slice(), inserted = [];
        for (let i = 0, pos = 0; i < sections.length; i += 2) {
          let len = sections[i], ins = sections[i + 1];
          if (ins >= 0) {
            sections[i] = ins;
            sections[i + 1] = len;
            let index = i >> 1;
            while (inserted.length < index)
              inserted.push(Text.empty);
            inserted.push(len ? doc.slice(pos, pos + len) : Text.empty);
          }
          pos += len;
        }
        return new _ChangeSet(sections, inserted);
      }
      /**
      Combine two subsequent change sets into a single set. `other`
      must start in the document produced by `this`. If `this` goes
      `docA` → `docB` and `other` represents `docB` → `docC`, the
      returned value will represent the change `docA` → `docC`.
      */
      compose(other) {
        return this.empty ? other : other.empty ? this : composeSets(this, other, true);
      }
      /**
      Given another change set starting in the same document, maps this
      change set over the other, producing a new change set that can be
      applied to the document produced by applying `other`. When
      `before` is `true`, order changes as if `this` comes before
      `other`, otherwise (the default) treat `other` as coming first.
      
      Given two changes `A` and `B`, `A.compose(B.map(A))` and
      `B.compose(A.map(B, true))` will produce the same document. This
      provides a basic form of [operational
      transformation](https://en.wikipedia.org/wiki/Operational_transformation),
      and can be used for collaborative editing.
      */
      map(other, before = false) {
        return other.empty ? this : mapSet(this, other, before, true);
      }
      /**
      Iterate over the changed ranges in the document, calling `f` for
      each, with the range in the original document (`fromA`-`toA`)
      and the range that replaces it in the new document
      (`fromB`-`toB`).
      
      When `individual` is true, adjacent changes are reported
      separately.
      */
      iterChanges(f, individual = false) {
        iterChanges(this, f, individual);
      }
      /**
      Get a [change description](https://codemirror.net/6/docs/ref/#state.ChangeDesc) for this change
      set.
      */
      get desc() {
        return ChangeDesc.create(this.sections);
      }
      /**
      @internal
      */
      filter(ranges) {
        let resultSections = [], resultInserted = [], filteredSections = [];
        let iter = new SectionIter(this);
        done: for (let i = 0, pos = 0; ; ) {
          let next = i == ranges.length ? 1e9 : ranges[i++];
          while (pos < next || pos == next && iter.len == 0) {
            if (iter.done)
              break done;
            let len = Math.min(iter.len, next - pos);
            addSection(filteredSections, len, -1);
            let ins = iter.ins == -1 ? -1 : iter.off == 0 ? iter.ins : 0;
            addSection(resultSections, len, ins);
            if (ins > 0)
              addInsert(resultInserted, resultSections, iter.text);
            iter.forward(len);
            pos += len;
          }
          let end = ranges[i++];
          while (pos < end) {
            if (iter.done)
              break done;
            let len = Math.min(iter.len, end - pos);
            addSection(resultSections, len, -1);
            addSection(filteredSections, len, iter.ins == -1 ? -1 : iter.off == 0 ? iter.ins : 0);
            iter.forward(len);
            pos += len;
          }
        }
        return {
          changes: new _ChangeSet(resultSections, resultInserted),
          filtered: ChangeDesc.create(filteredSections)
        };
      }
      /**
      Serialize this change set to a JSON-representable value.
      */
      toJSON() {
        let parts = [];
        for (let i = 0; i < this.sections.length; i += 2) {
          let len = this.sections[i], ins = this.sections[i + 1];
          if (ins < 0)
            parts.push(len);
          else if (ins == 0)
            parts.push([len]);
          else
            parts.push([len].concat(this.inserted[i >> 1].toJSON()));
        }
        return parts;
      }
      /**
      Create a change set for the given changes, for a document of the
      given length, using `lineSep` as line separator.
      */
      static of(changes, length, lineSep) {
        let sections = [], inserted = [], pos = 0;
        let total = null;
        function flush(force = false) {
          if (!force && !sections.length)
            return;
          if (pos < length)
            addSection(sections, length - pos, -1);
          let set = new _ChangeSet(sections, inserted);
          total = total ? total.compose(set.map(total)) : set;
          sections = [];
          inserted = [];
          pos = 0;
        }
        function process2(spec) {
          if (Array.isArray(spec)) {
            for (let sub of spec)
              process2(sub);
          } else if (spec instanceof _ChangeSet) {
            if (spec.length != length)
              throw new RangeError(`Mismatched change set length (got ${spec.length}, expected ${length})`);
            flush();
            total = total ? total.compose(spec.map(total)) : spec;
          } else {
            let { from, to = from, insert: insert2 } = spec;
            if (from > to || from < 0 || to > length)
              throw new RangeError(`Invalid change range ${from} to ${to} (in doc of length ${length})`);
            let insText = !insert2 ? Text.empty : typeof insert2 == "string" ? Text.of(insert2.split(lineSep || DefaultSplit)) : insert2;
            let insLen = insText.length;
            if (from == to && insLen == 0)
              return;
            if (from < pos)
              flush();
            if (from > pos)
              addSection(sections, from - pos, -1);
            addSection(sections, to - from, insLen);
            addInsert(inserted, sections, insText);
            pos = to;
          }
        }
        process2(changes);
        flush(!total);
        return total;
      }
      /**
      Create an empty changeset of the given length.
      */
      static empty(length) {
        return new _ChangeSet(length ? [length, -1] : [], []);
      }
      /**
      Create a changeset from its JSON representation (as produced by
      [`toJSON`](https://codemirror.net/6/docs/ref/#state.ChangeSet.toJSON).
      */
      static fromJSON(json) {
        if (!Array.isArray(json))
          throw new RangeError("Invalid JSON representation of ChangeSet");
        let sections = [], inserted = [];
        for (let i = 0; i < json.length; i++) {
          let part = json[i];
          if (typeof part == "number") {
            sections.push(part, -1);
          } else if (!Array.isArray(part) || typeof part[0] != "number" || part.some((e, i2) => i2 && typeof e != "string")) {
            throw new RangeError("Invalid JSON representation of ChangeSet");
          } else if (part.length == 1) {
            sections.push(part[0], 0);
          } else {
            while (inserted.length < i)
              inserted.push(Text.empty);
            inserted[i] = Text.of(part.slice(1));
            sections.push(part[0], inserted[i].length);
          }
        }
        return new _ChangeSet(sections, inserted);
      }
      /**
      @internal
      */
      static createSet(sections, inserted) {
        return new _ChangeSet(sections, inserted);
      }
    };
    function addSection(sections, len, ins, forceJoin = false) {
      if (len == 0 && ins <= 0)
        return;
      let last2 = sections.length - 2;
      if (last2 >= 0 && ins <= 0 && ins == sections[last2 + 1])
        sections[last2] += len;
      else if (last2 >= 0 && len == 0 && sections[last2] == 0)
        sections[last2 + 1] += ins;
      else if (forceJoin) {
        sections[last2] += len;
        sections[last2 + 1] += ins;
      } else
        sections.push(len, ins);
    }
    function addInsert(values, sections, value) {
      if (value.length == 0)
        return;
      let index = sections.length - 2 >> 1;
      if (index < values.length) {
        values[values.length - 1] = values[values.length - 1].append(value);
      } else {
        while (values.length < index)
          values.push(Text.empty);
        values.push(value);
      }
    }
    function iterChanges(desc, f, individual) {
      let inserted = desc.inserted;
      for (let posA = 0, posB = 0, i = 0; i < desc.sections.length; ) {
        let len = desc.sections[i++], ins = desc.sections[i++];
        if (ins < 0) {
          posA += len;
          posB += len;
        } else {
          let endA = posA, endB = posB, text = Text.empty;
          for (; ; ) {
            endA += len;
            endB += ins;
            if (ins && inserted)
              text = text.append(inserted[i - 2 >> 1]);
            if (individual || i == desc.sections.length || desc.sections[i + 1] < 0)
              break;
            len = desc.sections[i++];
            ins = desc.sections[i++];
          }
          f(posA, endA, posB, endB, text);
          posA = endA;
          posB = endB;
        }
      }
    }
    function mapSet(setA, setB, before, mkSet = false) {
      let sections = [], insert2 = mkSet ? [] : null;
      let a = new SectionIter(setA), b = new SectionIter(setB);
      for (let inserted = -1; ; ) {
        if (a.done && b.len || b.done && a.len) {
          throw new Error("Mismatched change set lengths");
        } else if (a.ins == -1 && b.ins == -1) {
          let len = Math.min(a.len, b.len);
          addSection(sections, len, -1);
          a.forward(len);
          b.forward(len);
        } else if (b.ins >= 0 && (a.ins < 0 || inserted == a.i || a.off == 0 && (b.len < a.len || b.len == a.len && !before))) {
          let len = b.len;
          addSection(sections, b.ins, -1);
          while (len) {
            let piece = Math.min(a.len, len);
            if (a.ins >= 0 && inserted < a.i && a.len <= piece) {
              addSection(sections, 0, a.ins);
              if (insert2)
                addInsert(insert2, sections, a.text);
              inserted = a.i;
            }
            a.forward(piece);
            len -= piece;
          }
          b.next();
        } else if (a.ins >= 0) {
          let len = 0, left = a.len;
          while (left) {
            if (b.ins == -1) {
              let piece = Math.min(left, b.len);
              len += piece;
              left -= piece;
              b.forward(piece);
            } else if (b.ins == 0 && b.len < left) {
              left -= b.len;
              b.next();
            } else {
              break;
            }
          }
          addSection(sections, len, inserted < a.i ? a.ins : 0);
          if (insert2 && inserted < a.i)
            addInsert(insert2, sections, a.text);
          inserted = a.i;
          a.forward(a.len - left);
        } else if (a.done && b.done) {
          return insert2 ? ChangeSet.createSet(sections, insert2) : ChangeDesc.create(sections);
        } else {
          throw new Error("Mismatched change set lengths");
        }
      }
    }
    function composeSets(setA, setB, mkSet = false) {
      let sections = [];
      let insert2 = mkSet ? [] : null;
      let a = new SectionIter(setA), b = new SectionIter(setB);
      for (let open = false; ; ) {
        if (a.done && b.done) {
          return insert2 ? ChangeSet.createSet(sections, insert2) : ChangeDesc.create(sections);
        } else if (a.ins == 0) {
          addSection(sections, a.len, 0, open);
          a.next();
        } else if (b.len == 0 && !b.done) {
          addSection(sections, 0, b.ins, open);
          if (insert2)
            addInsert(insert2, sections, b.text);
          b.next();
        } else if (a.done || b.done) {
          throw new Error("Mismatched change set lengths");
        } else {
          let len = Math.min(a.len2, b.len), sectionLen = sections.length;
          if (a.ins == -1) {
            let insB = b.ins == -1 ? -1 : b.off ? 0 : b.ins;
            addSection(sections, len, insB, open);
            if (insert2 && insB)
              addInsert(insert2, sections, b.text);
          } else if (b.ins == -1) {
            addSection(sections, a.off ? 0 : a.len, len, open);
            if (insert2)
              addInsert(insert2, sections, a.textBit(len));
          } else {
            addSection(sections, a.off ? 0 : a.len, b.off ? 0 : b.ins, open);
            if (insert2 && !b.off)
              addInsert(insert2, sections, b.text);
          }
          open = (a.ins > len || b.ins >= 0 && b.len > len) && (open || sections.length > sectionLen);
          a.forward2(len);
          b.forward(len);
        }
      }
    }
    var SectionIter = class {
      constructor(set) {
        this.set = set;
        this.i = 0;
        this.next();
      }
      next() {
        let { sections } = this.set;
        if (this.i < sections.length) {
          this.len = sections[this.i++];
          this.ins = sections[this.i++];
        } else {
          this.len = 0;
          this.ins = -2;
        }
        this.off = 0;
      }
      get done() {
        return this.ins == -2;
      }
      get len2() {
        return this.ins < 0 ? this.len : this.ins;
      }
      get text() {
        let { inserted } = this.set, index = this.i - 2 >> 1;
        return index >= inserted.length ? Text.empty : inserted[index];
      }
      textBit(len) {
        let { inserted } = this.set, index = this.i - 2 >> 1;
        return index >= inserted.length && !len ? Text.empty : inserted[index].slice(this.off, len == null ? void 0 : this.off + len);
      }
      forward(len) {
        if (len == this.len)
          this.next();
        else {
          this.len -= len;
          this.off += len;
        }
      }
      forward2(len) {
        if (this.ins == -1)
          this.forward(len);
        else if (len == this.ins)
          this.next();
        else {
          this.ins -= len;
          this.off += len;
        }
      }
    };
    var SelectionRange = class _SelectionRange {
      constructor(from, to, flags, goalColumn) {
        this.from = from;
        this.to = to;
        this.flags = flags;
        this.goalColumn = goalColumn;
      }
      /**
      The anchor of the range—the side that doesn't move when you
      extend it.
      */
      get anchor() {
        return this.flags & 32 ? this.to : this.from;
      }
      /**
      The head of the range, which is moved when the range is
      [extended](https://codemirror.net/6/docs/ref/#state.SelectionRange.extend).
      */
      get head() {
        return this.flags & 32 ? this.from : this.to;
      }
      /**
      True when `anchor` and `head` are at the same position.
      */
      get empty() {
        return this.from == this.to;
      }
      /**
      If this is a cursor that is explicitly associated with the
      character on one of its sides, this returns the side. -1 means
      the character before its position, 1 the character after, and 0
      means no association.
      */
      get assoc() {
        return this.flags & 8 ? -1 : this.flags & 16 ? 1 : 0;
      }
      /**
      A flag that, when set, makes some selection-extending commands
      treat the range's head and anchor as exchangeable, so that for
      example Shift-ArrowUp will make the lower side of the selection
      the anchor, even if that was the head before. Used to implement
      MacOS-style undirectional selections.
      */
      get undirectional() {
        return (this.flags & 64) > 0;
      }
      /**
      The bidirectional text level associated with this cursor, if
      any.
      */
      get bidiLevel() {
        let level = this.flags & 7;
        return level == 7 ? null : level;
      }
      /**
      Map this range through a change, producing a valid range in the
      updated document.
      */
      map(change, assoc = -1) {
        let from, to;
        if (this.empty) {
          from = to = change.mapPos(this.from, assoc);
        } else {
          from = change.mapPos(this.from, 1);
          to = change.mapPos(this.to, -1);
        }
        return from == this.from && to == this.to ? this : new _SelectionRange(from, to, this.flags, this.goalColumn);
      }
      /**
      Extend this range to cover at least `from` to `to`.
      */
      extend(from, to = from, assoc = 0) {
        if (from <= this.anchor && to >= this.anchor)
          return EditorSelection.range(from, to, void 0, void 0, assoc);
        let head = Math.abs(from - this.anchor) > Math.abs(to - this.anchor) ? from : to;
        return EditorSelection.range(this.anchor, head, void 0, void 0, assoc);
      }
      /**
      Compare this range to another range.
      */
      eq(other, includeAssoc = false) {
        return this.anchor == other.anchor && this.head == other.head && this.goalColumn == other.goalColumn && (!includeAssoc || !this.empty || this.assoc == other.assoc);
      }
      /**
      Return a JSON-serializable object representing the range.
      */
      toJSON() {
        return { anchor: this.anchor, head: this.head };
      }
      /**
      Convert a JSON representation of a range to a `SelectionRange`
      instance.
      */
      static fromJSON(json) {
        if (!json || typeof json.anchor != "number" || typeof json.head != "number")
          throw new RangeError("Invalid JSON representation for SelectionRange");
        return EditorSelection.range(json.anchor, json.head);
      }
      /**
      @internal
      */
      static create(from, to, flags, goalColumn) {
        return new _SelectionRange(from, to, flags, goalColumn);
      }
    };
    var EditorSelection = class _EditorSelection {
      constructor(ranges, mainIndex) {
        this.ranges = ranges;
        this.mainIndex = mainIndex;
      }
      /**
      Map a selection through a change. Used to adjust the selection
      position for changes.
      */
      map(change, assoc = -1) {
        if (change.empty)
          return this;
        return _EditorSelection.create(this.ranges.map((r) => r.map(change, assoc)), this.mainIndex);
      }
      /**
      Compare this selection to another selection. By default, ranges
      are compared only by position. When `includeAssoc` is true,
      cursor ranges must also have the same
      [`assoc`](https://codemirror.net/6/docs/ref/#state.SelectionRange.assoc) value.
      */
      eq(other, includeAssoc = false) {
        if (this.ranges.length != other.ranges.length || this.mainIndex != other.mainIndex)
          return false;
        for (let i = 0; i < this.ranges.length; i++)
          if (!this.ranges[i].eq(other.ranges[i], includeAssoc))
            return false;
        return true;
      }
      /**
      Get the primary selection range. Usually, you should make sure
      your code applies to _all_ ranges, by using methods like
      [`changeByRange`](https://codemirror.net/6/docs/ref/#state.EditorState.changeByRange).
      */
      get main() {
        return this.ranges[this.mainIndex];
      }
      /**
      Make sure the selection only has one range. Returns a selection
      holding only the main range from this selection.
      */
      asSingle() {
        return this.ranges.length == 1 ? this : new _EditorSelection([this.main], 0);
      }
      /**
      Extend this selection with an extra range.
      */
      addRange(range, main = true) {
        return _EditorSelection.create([range].concat(this.ranges), main ? 0 : this.mainIndex + 1);
      }
      /**
      Replace a given range with another range, and then normalize the
      selection to merge and sort ranges if necessary.
      */
      replaceRange(range, which = this.mainIndex) {
        let ranges = this.ranges.slice();
        ranges[which] = range;
        return _EditorSelection.create(ranges, this.mainIndex);
      }
      /**
      Convert this selection to an object that can be serialized to
      JSON.
      */
      toJSON() {
        return { ranges: this.ranges.map((r) => r.toJSON()), main: this.mainIndex };
      }
      /**
      Create a selection from a JSON representation.
      */
      static fromJSON(json) {
        if (!json || !Array.isArray(json.ranges) || typeof json.main != "number" || json.main >= json.ranges.length)
          throw new RangeError("Invalid JSON representation for EditorSelection");
        return new _EditorSelection(json.ranges.map((r) => SelectionRange.fromJSON(r)), json.main);
      }
      /**
      Create a selection holding a single range.
      */
      static single(anchor, head = anchor) {
        return new _EditorSelection([_EditorSelection.range(anchor, head)], 0);
      }
      /**
      Sort and merge the given set of ranges, creating a valid
      selection.
      */
      static create(ranges, mainIndex = 0) {
        if (ranges.length == 0)
          throw new RangeError("A selection needs at least one range");
        for (let pos = 0, i = 0; i < ranges.length; i++) {
          let range = ranges[i];
          if (range.empty ? range.from <= pos : range.from < pos)
            return _EditorSelection.normalized(ranges.slice(), mainIndex);
          pos = range.to;
        }
        return new _EditorSelection(ranges, mainIndex);
      }
      /**
      Create a cursor selection range at the given position. You can
      safely ignore the optional arguments in most situations.
      */
      static cursor(pos, assoc = 0, bidiLevel, goalColumn) {
        return SelectionRange.create(pos, pos, (assoc == 0 ? 0 : assoc < 0 ? 8 : 16) | (bidiLevel == null ? 7 : Math.min(6, bidiLevel)), goalColumn);
      }
      /**
      Create a selection range.
      */
      static range(anchor, head, goalColumn, bidiLevel, assoc) {
        let flags = bidiLevel == null ? 7 : Math.min(6, bidiLevel);
        if (!assoc && anchor != head)
          assoc = head < anchor ? 1 : -1;
        if (assoc)
          flags |= assoc < 0 ? 8 : 16;
        return head < anchor ? SelectionRange.create(head, anchor, flags | 32, goalColumn) : SelectionRange.create(anchor, head, flags, goalColumn);
      }
      /**
      Create an [undirectional](https://codemirror.net/6/docs/ref/#state.SelectionRange.undirectional)
      selection range.
      */
      static undirectionalRange(from, to) {
        return SelectionRange.create(from, to, 64, void 0);
      }
      /**
      @internal
      */
      static normalized(ranges, mainIndex = 0) {
        let main = ranges[mainIndex];
        ranges.sort((a, b) => a.from - b.from);
        mainIndex = ranges.indexOf(main);
        for (let i = 1; i < ranges.length; i++) {
          let range = ranges[i], prev = ranges[i - 1];
          if (range.empty ? range.from <= prev.to : range.from < prev.to) {
            let from = prev.from, to = Math.max(range.to, prev.to);
            if (i <= mainIndex)
              mainIndex--;
            ranges.splice(--i, 2, range.anchor > range.head ? _EditorSelection.range(to, from) : _EditorSelection.range(from, to));
          }
        }
        return new _EditorSelection(ranges, mainIndex);
      }
    };
    function checkSelection(selection, docLength) {
      for (let range of selection.ranges)
        if (range.to > docLength)
          throw new RangeError("Selection points outside of document");
    }
    var nextID = 0;
    var Facet = class _Facet {
      constructor(combine, compareInput, compare2, isStatic, enables) {
        this.combine = combine;
        this.compareInput = compareInput;
        this.compare = compare2;
        this.isStatic = isStatic;
        this.id = nextID++;
        this.default = combine([]);
        this.extensions = typeof enables == "function" ? enables(this) : enables;
      }
      /**
      Returns a facet reader for this facet, which can be used to
      [read](https://codemirror.net/6/docs/ref/#state.EditorState.facet) it but not to define values for it.
      */
      get reader() {
        return this;
      }
      /**
      Define a new facet.
      */
      static define(config2 = {}) {
        return new _Facet(config2.combine || ((a) => a), config2.compareInput || ((a, b) => a === b), config2.compare || (!config2.combine ? sameArray : (a, b) => a === b), !!config2.static, config2.enables);
      }
      /**
      Returns an extension that adds the given value to this facet.
      */
      of(value) {
        return new FacetProvider([], this, 0, value);
      }
      /**
      Create an extension that computes a value for the facet from a
      state. You must take care to declare the parts of the state that
      this value depends on, since your function is only called again
      for a new state when one of those parts changed.
      
      In cases where your value depends only on a single field, you'll
      want to use the [`from`](https://codemirror.net/6/docs/ref/#state.Facet.from) method instead.
      */
      compute(deps, get) {
        if (this.isStatic)
          throw new Error("Can't compute a static facet");
        return new FacetProvider(deps, this, 1, get);
      }
      /**
      Create an extension that computes zero or more values for this
      facet from a state.
      */
      computeN(deps, get) {
        if (this.isStatic)
          throw new Error("Can't compute a static facet");
        return new FacetProvider(deps, this, 2, get);
      }
      from(field, get) {
        if (!get)
          get = (x) => x;
        return this.compute([field], (state) => get(state.field(field)));
      }
    };
    function sameArray(a, b) {
      return a == b || a.length == b.length && a.every((e, i) => e === b[i]);
    }
    var FacetProvider = class {
      constructor(dependencies, facet, type, value) {
        this.dependencies = dependencies;
        this.facet = facet;
        this.type = type;
        this.value = value;
        this.id = nextID++;
      }
      dynamicSlot(addresses) {
        var _a;
        let getter = this.value;
        let compare2 = this.facet.compareInput;
        let id = this.id, idx = addresses[id] >> 1, multi = this.type == 2;
        let depDoc = false, depSel = false, depAddrs = [];
        for (let dep of this.dependencies) {
          if (dep == "doc")
            depDoc = true;
          else if (dep == "selection")
            depSel = true;
          else if ((((_a = addresses[dep.id]) !== null && _a !== void 0 ? _a : 1) & 1) == 0)
            depAddrs.push(addresses[dep.id]);
        }
        return {
          create(state) {
            state.values[idx] = getter(state);
            return 1;
          },
          update(state, tr) {
            if (depDoc && tr.docChanged || depSel && (tr.docChanged || tr.selection) || ensureAll(state, depAddrs)) {
              let newVal = getter(state);
              if (multi ? !compareArray(newVal, state.values[idx], compare2) : !compare2(newVal, state.values[idx])) {
                state.values[idx] = newVal;
                return 1;
              }
            }
            return 0;
          },
          reconfigure: (state, oldState) => {
            let newVal, oldAddr = oldState.config.address[id];
            if (oldAddr != null) {
              let oldVal = getAddr(oldState, oldAddr);
              if (this.dependencies.every((dep) => {
                return dep instanceof Facet ? oldState.facet(dep) === state.facet(dep) : dep instanceof StateField ? oldState.field(dep, false) == state.field(dep, false) : true;
              }) || (multi ? compareArray(newVal = getter(state), oldVal, compare2) : compare2(newVal = getter(state), oldVal))) {
                state.values[idx] = oldVal;
                return 0;
              }
            } else {
              newVal = getter(state);
            }
            state.values[idx] = newVal;
            return 1;
          }
        };
      }
      get extension() {
        return this;
      }
    };
    function compareArray(a, b, compare2) {
      if (a.length != b.length)
        return false;
      for (let i = 0; i < a.length; i++)
        if (!compare2(a[i], b[i]))
          return false;
      return true;
    }
    function ensureAll(state, addrs) {
      let changed = false;
      for (let addr of addrs)
        if (ensureAddr(state, addr) & 1)
          changed = true;
      return changed;
    }
    function dynamicFacetSlot(addresses, facet, providers) {
      let providerAddrs = providers.map((p) => addresses[p.id]);
      let providerTypes = providers.map((p) => p.type);
      let dynamic = providerAddrs.filter((p) => !(p & 1));
      let idx = addresses[facet.id] >> 1;
      function get(state) {
        let values = [];
        for (let i = 0; i < providerAddrs.length; i++) {
          let value = getAddr(state, providerAddrs[i]);
          if (providerTypes[i] == 2)
            for (let val of value)
              values.push(val);
          else
            values.push(value);
        }
        return facet.combine(values);
      }
      return {
        create(state) {
          for (let addr of providerAddrs)
            ensureAddr(state, addr);
          state.values[idx] = get(state);
          return 1;
        },
        update(state, tr) {
          if (!ensureAll(state, dynamic))
            return 0;
          let value = get(state);
          if (facet.compare(value, state.values[idx]))
            return 0;
          state.values[idx] = value;
          return 1;
        },
        reconfigure(state, oldState) {
          let depChanged = ensureAll(state, providerAddrs);
          let oldProviders = oldState.config.facets[facet.id], oldValue = oldState.facet(facet);
          if (oldProviders && !depChanged && sameArray(providers, oldProviders)) {
            state.values[idx] = oldValue;
            return 0;
          }
          let value = get(state);
          if (facet.compare(value, oldValue)) {
            state.values[idx] = oldValue;
            return 0;
          }
          state.values[idx] = value;
          return 1;
        }
      };
    }
    var initField = Facet.define({ static: true });
    var StateField = class _StateField {
      constructor(id, createF, updateF, compareF, spec) {
        this.id = id;
        this.createF = createF;
        this.updateF = updateF;
        this.compareF = compareF;
        this.spec = spec;
        this.provides = void 0;
      }
      /**
      Define a state field.
      */
      static define(config2) {
        let field = new _StateField(nextID++, config2.create, config2.update, config2.compare || ((a, b) => a === b), config2);
        if (config2.provide)
          field.provides = config2.provide(field);
        return field;
      }
      create(state) {
        let init = state.facet(initField).find((i) => i.field == this);
        return ((init === null || init === void 0 ? void 0 : init.create) || this.createF)(state);
      }
      /**
      @internal
      */
      slot(addresses) {
        let idx = addresses[this.id] >> 1;
        return {
          create: (state) => {
            state.values[idx] = this.create(state);
            return 1;
          },
          update: (state, tr) => {
            let oldVal = state.values[idx];
            let value = this.updateF(oldVal, tr);
            if (this.compareF(oldVal, value))
              return 0;
            state.values[idx] = value;
            return 1;
          },
          reconfigure: (state, oldState) => {
            let init = state.facet(initField), oldInit = oldState.facet(initField), reInit;
            if ((reInit = init.find((i) => i.field == this)) && reInit != oldInit.find((i) => i.field == this)) {
              state.values[idx] = reInit.create(state);
              return 1;
            }
            if (oldState.config.address[this.id] != null) {
              state.values[idx] = oldState.field(this);
              return 0;
            }
            state.values[idx] = this.create(state);
            return 1;
          }
        };
      }
      /**
      Returns an extension that enables this field and overrides the
      way it is initialized. Can be useful when you need to provide a
      non-default starting value for the field.
      */
      init(create) {
        return [this, initField.of({ field: this, create })];
      }
      /**
      State field instances can be used as
      [`Extension`](https://codemirror.net/6/docs/ref/#state.Extension) values to enable the field in a
      given state.
      */
      get extension() {
        return this;
      }
    };
    var Prec_ = { lowest: 4, low: 3, default: 2, high: 1, highest: 0 };
    function prec(value) {
      return (ext) => new PrecExtension(ext, value);
    }
    var Prec = {
      /**
      The highest precedence level, for extensions that should end up
      near the start of the precedence ordering.
      */
      highest: prec(Prec_.highest),
      /**
      A higher-than-default precedence, for extensions that should
      come before those with default precedence.
      */
      high: prec(Prec_.high),
      /**
      The default precedence, which is also used for extensions
      without an explicit precedence.
      */
      default: prec(Prec_.default),
      /**
      A lower-than-default precedence.
      */
      low: prec(Prec_.low),
      /**
      The lowest precedence level. Meant for things that should end up
      near the end of the extension order.
      */
      lowest: prec(Prec_.lowest)
    };
    var PrecExtension = class {
      constructor(inner, prec2) {
        this.inner = inner;
        this.prec = prec2;
      }
      get extension() {
        return this;
      }
    };
    var Compartment = class _Compartment {
      /**
      Create an instance of this compartment to add to your [state
      configuration](https://codemirror.net/6/docs/ref/#state.EditorStateConfig.extensions).
      */
      of(ext) {
        return new CompartmentInstance(this, ext);
      }
      /**
      Create an [effect](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) that
      reconfigures this compartment.
      */
      reconfigure(content) {
        return _Compartment.reconfigure.of({ compartment: this, extension: content });
      }
      /**
      Get the current content of the compartment in the state, or
      `undefined` if it isn't present.
      */
      get(state) {
        return state.config.compartments.get(this);
      }
    };
    var CompartmentInstance = class {
      constructor(compartment, inner) {
        this.compartment = compartment;
        this.inner = inner;
      }
      get extension() {
        return this;
      }
    };
    var Configuration = class _Configuration {
      constructor(base, compartments, dynamicSlots, address, staticValues, facets) {
        this.base = base;
        this.compartments = compartments;
        this.dynamicSlots = dynamicSlots;
        this.address = address;
        this.staticValues = staticValues;
        this.facets = facets;
        this.statusTemplate = [];
        while (this.statusTemplate.length < dynamicSlots.length)
          this.statusTemplate.push(
            0
            /* SlotStatus.Unresolved */
          );
      }
      staticFacet(facet) {
        let addr = this.address[facet.id];
        return addr == null ? facet.default : this.staticValues[addr >> 1];
      }
      static resolve(base, compartments, oldState) {
        let fields = [];
        let facets = /* @__PURE__ */ Object.create(null);
        let newCompartments = /* @__PURE__ */ new Map();
        for (let ext of flatten(base, compartments, newCompartments)) {
          if (ext instanceof StateField)
            fields.push(ext);
          else
            (facets[ext.facet.id] || (facets[ext.facet.id] = [])).push(ext);
        }
        let address = /* @__PURE__ */ Object.create(null);
        let staticValues = [];
        let dynamicSlots = [];
        for (let field of fields) {
          address[field.id] = dynamicSlots.length << 1;
          dynamicSlots.push((a) => field.slot(a));
        }
        let oldFacets = oldState === null || oldState === void 0 ? void 0 : oldState.config.facets;
        for (let id in facets) {
          let providers = facets[id], facet = providers[0].facet;
          let oldProviders = oldFacets && oldFacets[id] || [];
          if (providers.every(
            (p) => p.type == 0
            /* Provider.Static */
          )) {
            address[facet.id] = staticValues.length << 1 | 1;
            if (sameArray(oldProviders, providers)) {
              staticValues.push(oldState.facet(facet));
            } else {
              let value = facet.combine(providers.map((p) => p.value));
              staticValues.push(oldState && facet.compare(value, oldState.facet(facet)) ? oldState.facet(facet) : value);
            }
          } else {
            for (let p of providers) {
              if (p.type == 0) {
                address[p.id] = staticValues.length << 1 | 1;
                staticValues.push(p.value);
              } else {
                address[p.id] = dynamicSlots.length << 1;
                dynamicSlots.push((a) => p.dynamicSlot(a));
              }
            }
            address[facet.id] = dynamicSlots.length << 1;
            dynamicSlots.push((a) => dynamicFacetSlot(a, facet, providers));
          }
        }
        let dynamic = dynamicSlots.map((f) => f(address));
        return new _Configuration(base, newCompartments, dynamic, address, staticValues, facets);
      }
    };
    function flatten(extension, compartments, newCompartments) {
      let result = [[], [], [], [], []];
      let seen = /* @__PURE__ */ new Map();
      function inner(ext, prec2) {
        let known = seen.get(ext);
        if (known != null) {
          if (known <= prec2)
            return;
          let found = result[known].indexOf(ext);
          if (found > -1)
            result[known].splice(found, 1);
          if (ext instanceof CompartmentInstance)
            newCompartments.delete(ext.compartment);
        }
        seen.set(ext, prec2);
        if (Array.isArray(ext)) {
          for (let e of ext)
            inner(e, prec2);
        } else if (ext instanceof CompartmentInstance) {
          if (newCompartments.has(ext.compartment))
            throw new RangeError(`Duplicate use of compartment in extensions`);
          let content = compartments.get(ext.compartment) || ext.inner;
          newCompartments.set(ext.compartment, content);
          inner(content, prec2);
        } else if (ext instanceof PrecExtension) {
          inner(ext.inner, ext.prec);
        } else if (ext instanceof StateField) {
          result[prec2].push(ext);
          if (ext.provides)
            inner(ext.provides, prec2);
        } else if (ext instanceof FacetProvider) {
          result[prec2].push(ext);
          if (ext.facet.extensions)
            inner(ext.facet.extensions, Prec_.default);
        } else {
          let content = ext.extension;
          if (!content)
            throw new Error(`Unrecognized extension value in extension set (${ext}).`);
          if (content == ext)
            throw new Error(`Unrecognized extension value in extension set (${ext}). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.`);
          inner(content, prec2);
        }
      }
      inner(extension, Prec_.default);
      return result.reduce((a, b) => a.concat(b));
    }
    function ensureAddr(state, addr) {
      if (addr & 1)
        return 2;
      let idx = addr >> 1;
      let status = state.status[idx];
      if (status == 4)
        throw new Error("Cyclic dependency between fields and/or facets");
      if (status & 2)
        return status;
      state.status[idx] = 4;
      let changed = state.computeSlot(state, state.config.dynamicSlots[idx]);
      return state.status[idx] = 2 | changed;
    }
    function getAddr(state, addr) {
      return addr & 1 ? state.config.staticValues[addr >> 1] : state.values[addr >> 1];
    }
    var languageData = Facet.define();
    var allowMultipleSelections = Facet.define({
      combine: (values) => values.some((v) => v),
      static: true
    });
    var lineSeparator = Facet.define({
      combine: (values) => values.length ? values[0] : void 0,
      static: true
    });
    var changeFilter = Facet.define();
    var transactionFilter = Facet.define();
    var transactionExtender = Facet.define();
    var readOnly = Facet.define({
      combine: (values) => values.length ? values[0] : false
    });
    var Annotation = class {
      /**
      @internal
      */
      constructor(type, value) {
        this.type = type;
        this.value = value;
      }
      /**
      Define a new type of annotation.
      */
      static define() {
        return new AnnotationType();
      }
    };
    var AnnotationType = class {
      /**
      Create an instance of this annotation.
      */
      of(value) {
        return new Annotation(this, value);
      }
    };
    var StateEffectType = class {
      /**
      @internal
      */
      constructor(map) {
        this.map = map;
      }
      /**
      Create a [state effect](https://codemirror.net/6/docs/ref/#state.StateEffect) instance of this
      type.
      */
      of(value) {
        return new StateEffect(this, value);
      }
    };
    var StateEffect = class _StateEffect {
      /**
      @internal
      */
      constructor(type, value) {
        this.type = type;
        this.value = value;
      }
      /**
      Map this effect through a position mapping. Will return
      `undefined` when that ends up deleting the effect.
      */
      map(mapping) {
        let mapped = this.type.map(this.value, mapping);
        return mapped === void 0 ? void 0 : mapped == this.value ? this : new _StateEffect(this.type, mapped);
      }
      /**
      Tells you whether this effect object is of a given
      [type](https://codemirror.net/6/docs/ref/#state.StateEffectType).
      */
      is(type) {
        return this.type == type;
      }
      /**
      Define a new effect type. The type parameter indicates the type
      of values that his effect holds. It should be a type that
      doesn't include `undefined`, since that is used in
      [mapping](https://codemirror.net/6/docs/ref/#state.StateEffect.map) to indicate that an effect is
      removed.
      */
      static define(spec = {}) {
        return new StateEffectType(spec.map || ((v) => v));
      }
      /**
      Map an array of effects through a change set.
      */
      static mapEffects(effects, mapping) {
        if (!effects.length)
          return effects;
        let result = [];
        for (let effect of effects) {
          let mapped = effect.map(mapping);
          if (mapped)
            result.push(mapped);
        }
        return result;
      }
    };
    StateEffect.reconfigure = StateEffect.define();
    StateEffect.appendConfig = StateEffect.define();
    var Transaction = class _Transaction {
      constructor(startState, changes, selection, effects, annotations, scrollIntoView) {
        this.startState = startState;
        this.changes = changes;
        this.selection = selection;
        this.effects = effects;
        this.annotations = annotations;
        this.scrollIntoView = scrollIntoView;
        this._doc = null;
        this._state = null;
        if (selection)
          checkSelection(selection, changes.newLength);
        if (!annotations.some((a) => a.type == _Transaction.time))
          this.annotations = annotations.concat(_Transaction.time.of(Date.now()));
      }
      /**
      @internal
      */
      static create(startState, changes, selection, effects, annotations, scrollIntoView) {
        return new _Transaction(startState, changes, selection, effects, annotations, scrollIntoView);
      }
      /**
      The new document produced by the transaction. Contrary to
      [`.state`](https://codemirror.net/6/docs/ref/#state.Transaction.state)`.doc`, accessing this won't
      force the entire new state to be computed right away, so it is
      recommended that [transaction
      filters](https://codemirror.net/6/docs/ref/#state.EditorState^transactionFilter) use this getter
      when they need to look at the new document.
      */
      get newDoc() {
        return this._doc || (this._doc = this.changes.apply(this.startState.doc));
      }
      /**
      The new selection produced by the transaction. If
      [`this.selection`](https://codemirror.net/6/docs/ref/#state.Transaction.selection) is undefined,
      this will [map](https://codemirror.net/6/docs/ref/#state.EditorSelection.map) the start state's
      current selection through the changes made by the transaction.
      */
      get newSelection() {
        return this.selection || this.startState.selection.map(this.changes);
      }
      /**
      The new state created by the transaction. Computed on demand
      (but retained for subsequent access), so it is recommended not to
      access it in [transaction
      filters](https://codemirror.net/6/docs/ref/#state.EditorState^transactionFilter) when possible.
      */
      get state() {
        if (!this._state)
          this.startState.applyTransaction(this);
        return this._state;
      }
      /**
      Get the value of the given annotation type, if any.
      */
      annotation(type) {
        for (let ann of this.annotations)
          if (ann.type == type)
            return ann.value;
        return void 0;
      }
      /**
      Indicates whether the transaction changed the document.
      */
      get docChanged() {
        return !this.changes.empty;
      }
      /**
      Indicates whether this transaction reconfigures the state
      (through a [configuration compartment](https://codemirror.net/6/docs/ref/#state.Compartment) or
      with a top-level configuration
      [effect](https://codemirror.net/6/docs/ref/#state.StateEffect^reconfigure).
      */
      get reconfigured() {
        return this.startState.config != this.state.config;
      }
      /**
      Returns true if the transaction has a [user
      event](https://codemirror.net/6/docs/ref/#state.Transaction^userEvent) annotation that is equal to
      or more specific than `event`. For example, if the transaction
      has `"select.pointer"` as user event, `"select"` and
      `"select.pointer"` will match it.
      */
      isUserEvent(event) {
        let e = this.annotation(_Transaction.userEvent);
        return !!(e && (e == event || e.length > event.length && e.slice(0, event.length) == event && e[event.length] == "."));
      }
    };
    Transaction.time = Annotation.define();
    Transaction.userEvent = Annotation.define();
    Transaction.addToHistory = Annotation.define();
    Transaction.remote = Annotation.define();
    function joinRanges(a, b) {
      let result = [];
      for (let iA = 0, iB = 0; ; ) {
        let from, to;
        if (iA < a.length && (iB == b.length || b[iB] >= a[iA])) {
          from = a[iA++];
          to = a[iA++];
        } else if (iB < b.length) {
          from = b[iB++];
          to = b[iB++];
        } else
          return result;
        if (!result.length || result[result.length - 1] < from)
          result.push(from, to);
        else if (result[result.length - 1] < to)
          result[result.length - 1] = to;
      }
    }
    function mergeTransaction(a, b, sequential) {
      var _a;
      let mapForA, mapForB, changes;
      if (sequential) {
        mapForA = b.changes;
        mapForB = ChangeSet.empty(b.changes.length);
        changes = a.changes.compose(b.changes);
      } else {
        mapForA = b.changes.map(a.changes);
        mapForB = a.changes.mapDesc(b.changes, true);
        changes = a.changes.compose(mapForA);
      }
      return {
        changes,
        selection: b.selection ? b.selection.map(mapForB) : (_a = a.selection) === null || _a === void 0 ? void 0 : _a.map(mapForA),
        effects: StateEffect.mapEffects(a.effects, mapForA).concat(StateEffect.mapEffects(b.effects, mapForB)),
        annotations: a.annotations.length ? a.annotations.concat(b.annotations) : b.annotations,
        scrollIntoView: a.scrollIntoView || b.scrollIntoView
      };
    }
    function resolveTransactionInner(state, spec, docSize) {
      let sel = spec.selection, annotations = asArray(spec.annotations);
      if (spec.userEvent)
        annotations = annotations.concat(Transaction.userEvent.of(spec.userEvent));
      return {
        changes: spec.changes instanceof ChangeSet ? spec.changes : ChangeSet.of(spec.changes || [], docSize, state.facet(lineSeparator)),
        selection: sel && (sel instanceof EditorSelection ? sel : EditorSelection.single(sel.anchor, sel.head)),
        effects: asArray(spec.effects),
        annotations,
        scrollIntoView: !!spec.scrollIntoView
      };
    }
    function resolveTransaction(state, specs, filter) {
      let s = resolveTransactionInner(state, specs.length ? specs[0] : {}, state.doc.length);
      if (specs.length && specs[0].filter === false)
        filter = false;
      for (let i = 1; i < specs.length; i++) {
        if (specs[i].filter === false)
          filter = false;
        let seq = !!specs[i].sequential;
        s = mergeTransaction(s, resolveTransactionInner(state, specs[i], seq ? s.changes.newLength : state.doc.length), seq);
      }
      let tr = Transaction.create(state, s.changes, s.selection, s.effects, s.annotations, s.scrollIntoView);
      return extendTransaction(filter ? filterTransaction(tr) : tr);
    }
    function filterTransaction(tr) {
      let state = tr.startState;
      let result = true;
      for (let filter of state.facet(changeFilter)) {
        let value = filter(tr);
        if (value === false) {
          result = false;
          break;
        }
        if (Array.isArray(value))
          result = result === true ? value : joinRanges(result, value);
      }
      if (result !== true) {
        let changes, back;
        if (result === false) {
          back = tr.changes.invertedDesc;
          changes = ChangeSet.empty(state.doc.length);
        } else {
          let filtered = tr.changes.filter(result);
          changes = filtered.changes;
          back = filtered.filtered.mapDesc(filtered.changes).invertedDesc;
        }
        tr = Transaction.create(state, changes, tr.selection && tr.selection.map(back), StateEffect.mapEffects(tr.effects, back), tr.annotations, tr.scrollIntoView);
      }
      let filters = state.facet(transactionFilter);
      for (let i = filters.length - 1; i >= 0; i--) {
        let filtered = filters[i](tr);
        if (filtered instanceof Transaction)
          tr = filtered;
        else if (Array.isArray(filtered) && filtered.length == 1 && filtered[0] instanceof Transaction)
          tr = filtered[0];
        else
          tr = resolveTransaction(state, asArray(filtered), false);
      }
      return tr;
    }
    function extendTransaction(tr) {
      let state = tr.startState, extenders = state.facet(transactionExtender), spec = tr;
      for (let i = extenders.length - 1; i >= 0; i--) {
        let extension = extenders[i](tr);
        if (extension && Object.keys(extension).length)
          spec = mergeTransaction(spec, resolveTransactionInner(state, extension, tr.changes.newLength), true);
      }
      return spec == tr ? tr : Transaction.create(state, tr.changes, tr.selection, spec.effects, spec.annotations, spec.scrollIntoView);
    }
    var none = [];
    function asArray(value) {
      return value == null ? none : Array.isArray(value) ? value : [value];
    }
    exports2.CharCategory = void 0;
    (function(CharCategory) {
      CharCategory[CharCategory["Word"] = 0] = "Word";
      CharCategory[CharCategory["Space"] = 1] = "Space";
      CharCategory[CharCategory["Other"] = 2] = "Other";
    })(exports2.CharCategory || (exports2.CharCategory = {}));
    var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
    var wordChar;
    try {
      wordChar = new RegExp("[\\p{Alphabetic}\\p{Number}_]", "u");
    } catch (_) {
    }
    function hasWordChar(str) {
      if (wordChar)
        return wordChar.test(str);
      for (let i = 0; i < str.length; i++) {
        let ch = str[i];
        if (/\w/.test(ch) || ch > "\x80" && (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch)))
          return true;
      }
      return false;
    }
    function makeCategorizer(wordChars) {
      return (char) => {
        if (!/\S/.test(char))
          return exports2.CharCategory.Space;
        if (hasWordChar(char))
          return exports2.CharCategory.Word;
        for (let i = 0; i < wordChars.length; i++)
          if (char.indexOf(wordChars[i]) > -1)
            return exports2.CharCategory.Word;
        return exports2.CharCategory.Other;
      };
    }
    var EditorState = class _EditorState {
      constructor(config2, doc, selection, values, computeSlot, tr) {
        this.config = config2;
        this.doc = doc;
        this.selection = selection;
        this.values = values;
        this.status = config2.statusTemplate.slice();
        this.computeSlot = computeSlot;
        if (tr)
          tr._state = this;
        for (let i = 0; i < this.config.dynamicSlots.length; i++)
          ensureAddr(this, i << 1);
        this.computeSlot = null;
      }
      field(field, require2 = true) {
        let addr = this.config.address[field.id];
        if (addr == null) {
          if (require2)
            throw new RangeError("Field is not present in this state");
          return void 0;
        }
        ensureAddr(this, addr);
        return getAddr(this, addr);
      }
      /**
      Create a [transaction](https://codemirror.net/6/docs/ref/#state.Transaction) that updates this
      state. Any number of [transaction specs](https://codemirror.net/6/docs/ref/#state.TransactionSpec)
      can be passed. Unless
      [`sequential`](https://codemirror.net/6/docs/ref/#state.TransactionSpec.sequential) is set, the
      [changes](https://codemirror.net/6/docs/ref/#state.TransactionSpec.changes) (if any) of each spec
      are assumed to start in the _current_ document (not the document
      produced by previous specs), and its
      [selection](https://codemirror.net/6/docs/ref/#state.TransactionSpec.selection) and
      [effects](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) are assumed to refer
      to the document created by its _own_ changes. The resulting
      transaction contains the combined effect of all the different
      specs. For [selection](https://codemirror.net/6/docs/ref/#state.TransactionSpec.selection), later
      specs take precedence over earlier ones.
      */
      update(...specs) {
        return resolveTransaction(this, specs, true);
      }
      /**
      @internal
      */
      applyTransaction(tr) {
        let conf = this.config, { base, compartments } = conf;
        for (let effect of tr.effects) {
          if (effect.is(Compartment.reconfigure)) {
            if (conf) {
              compartments = /* @__PURE__ */ new Map();
              conf.compartments.forEach((val, key) => compartments.set(key, val));
              conf = null;
            }
            compartments.set(effect.value.compartment, effect.value.extension);
          } else if (effect.is(StateEffect.reconfigure)) {
            conf = null;
            base = effect.value;
          } else if (effect.is(StateEffect.appendConfig)) {
            conf = null;
            base = asArray(base).concat(effect.value);
          }
        }
        let startValues;
        if (!conf) {
          conf = Configuration.resolve(base, compartments, this);
          let intermediateState = new _EditorState(conf, this.doc, this.selection, conf.dynamicSlots.map(() => null), (state, slot) => slot.reconfigure(state, this), null);
          startValues = intermediateState.values;
        } else {
          startValues = tr.startState.values.slice();
        }
        let selection = tr.startState.facet(allowMultipleSelections) ? tr.newSelection : tr.newSelection.asSingle();
        new _EditorState(conf, tr.newDoc, selection, startValues, (state, slot) => slot.update(state, tr), tr);
      }
      /**
      Create a [transaction spec](https://codemirror.net/6/docs/ref/#state.TransactionSpec) that
      replaces every selection range with the given content.
      */
      replaceSelection(text) {
        if (typeof text == "string")
          text = this.toText(text);
        return this.changeByRange((range) => ({
          changes: { from: range.from, to: range.to, insert: text },
          range: EditorSelection.cursor(range.from + text.length, -1)
        }));
      }
      /**
      Create a set of changes and a new selection by running the given
      function for each range in the active selection. The function
      can return an optional set of changes (in the coordinate space
      of the start document), plus an updated range (in the coordinate
      space of the document produced by the call's own changes). This
      method will merge all the changes and ranges into a single
      changeset and selection, and return it as a [transaction
      spec](https://codemirror.net/6/docs/ref/#state.TransactionSpec), which can be passed to
      [`update`](https://codemirror.net/6/docs/ref/#state.EditorState.update).
      */
      changeByRange(f) {
        let sel = this.selection;
        let result1 = f(sel.ranges[0]);
        let changes = this.changes(result1.changes), ranges = [result1.range];
        let effects = asArray(result1.effects);
        for (let i = 1; i < sel.ranges.length; i++) {
          let result = f(sel.ranges[i]);
          let newChanges = this.changes(result.changes), newMapped = newChanges.map(changes);
          for (let j = 0; j < i; j++)
            ranges[j] = ranges[j].map(newMapped);
          let mapBy = changes.mapDesc(newChanges, true);
          ranges.push(result.range.map(mapBy));
          changes = changes.compose(newMapped);
          effects = StateEffect.mapEffects(effects, newMapped).concat(StateEffect.mapEffects(asArray(result.effects), mapBy));
        }
        return {
          changes,
          selection: EditorSelection.create(ranges, sel.mainIndex),
          effects
        };
      }
      /**
      Create a [change set](https://codemirror.net/6/docs/ref/#state.ChangeSet) from the given change
      description, taking the state's document length and line
      separator into account.
      */
      changes(spec = []) {
        if (spec instanceof ChangeSet)
          return spec;
        return ChangeSet.of(spec, this.doc.length, this.facet(_EditorState.lineSeparator));
      }
      /**
      Using the state's [line
      separator](https://codemirror.net/6/docs/ref/#state.EditorState^lineSeparator), create a
      [`Text`](https://codemirror.net/6/docs/ref/#state.Text) instance from the given string.
      */
      toText(string) {
        return Text.of(string.split(this.facet(_EditorState.lineSeparator) || DefaultSplit));
      }
      /**
      Return the given range of the document as a string.
      */
      sliceDoc(from = 0, to = this.doc.length) {
        return this.doc.sliceString(from, to, this.lineBreak);
      }
      /**
      Get the value of a state [facet](https://codemirror.net/6/docs/ref/#state.Facet).
      */
      facet(facet) {
        let addr = this.config.address[facet.id];
        if (addr == null)
          return facet.default;
        ensureAddr(this, addr);
        return getAddr(this, addr);
      }
      /**
      Convert this state to a JSON-serializable object. When custom
      fields should be serialized, you can pass them in as an object
      mapping property names (in the resulting object, which should
      not use `doc` or `selection`) to fields.
      */
      toJSON(fields) {
        let result = {
          doc: this.sliceDoc(),
          selection: this.selection.toJSON()
        };
        if (fields)
          for (let prop in fields) {
            let value = fields[prop];
            if (value instanceof StateField && this.config.address[value.id] != null)
              result[prop] = value.spec.toJSON(this.field(fields[prop]), this);
          }
        return result;
      }
      /**
      Deserialize a state from its JSON representation. When custom
      fields should be deserialized, pass the same object you passed
      to [`toJSON`](https://codemirror.net/6/docs/ref/#state.EditorState.toJSON) when serializing as
      third argument.
      */
      static fromJSON(json, config2 = {}, fields) {
        if (!json || typeof json.doc != "string")
          throw new RangeError("Invalid JSON representation for EditorState");
        let fieldInit = [];
        if (fields)
          for (let prop in fields) {
            if (Object.prototype.hasOwnProperty.call(json, prop)) {
              let field = fields[prop], value = json[prop];
              fieldInit.push(field.init((state) => field.spec.fromJSON(value, state)));
            }
          }
        return _EditorState.create({
          doc: json.doc,
          selection: EditorSelection.fromJSON(json.selection),
          extensions: config2.extensions ? fieldInit.concat([config2.extensions]) : fieldInit
        });
      }
      /**
      Create a new state. You'll usually only need this when
      initializing an editor—updated states are created by applying
      transactions.
      */
      static create(config2 = {}) {
        let configuration = Configuration.resolve(config2.extensions || [], /* @__PURE__ */ new Map());
        let doc = config2.doc instanceof Text ? config2.doc : Text.of((config2.doc || "").split(configuration.staticFacet(_EditorState.lineSeparator) || DefaultSplit));
        let selection = !config2.selection ? EditorSelection.single(0) : config2.selection instanceof EditorSelection ? config2.selection : EditorSelection.single(config2.selection.anchor, config2.selection.head);
        checkSelection(selection, doc.length);
        if (!configuration.staticFacet(allowMultipleSelections))
          selection = selection.asSingle();
        return new _EditorState(configuration, doc, selection, configuration.dynamicSlots.map(() => null), (state, slot) => slot.create(state), null);
      }
      /**
      The size (in columns) of a tab in the document, determined by
      the [`tabSize`](https://codemirror.net/6/docs/ref/#state.EditorState^tabSize) facet.
      */
      get tabSize() {
        return this.facet(_EditorState.tabSize);
      }
      /**
      Get the proper [line-break](https://codemirror.net/6/docs/ref/#state.EditorState^lineSeparator)
      string for this state.
      */
      get lineBreak() {
        return this.facet(_EditorState.lineSeparator) || "\n";
      }
      /**
      Returns true when the editor is
      [configured](https://codemirror.net/6/docs/ref/#state.EditorState^readOnly) to be read-only.
      */
      get readOnly() {
        return this.facet(readOnly);
      }
      /**
      Look up a translation for the given phrase (via the
      [`phrases`](https://codemirror.net/6/docs/ref/#state.EditorState^phrases) facet), or return the
      original string if no translation is found.
      
      If additional arguments are passed, they will be inserted in
      place of markers like `$1` (for the first value) and `$2`, etc.
      A single `$` is equivalent to `$1`, and `$$` will produce a
      literal dollar sign.
      */
      phrase(phrase, ...insert2) {
        for (let map of this.facet(_EditorState.phrases))
          if (Object.prototype.hasOwnProperty.call(map, phrase)) {
            phrase = map[phrase];
            break;
          }
        if (insert2.length)
          phrase = phrase.replace(/\$(\$|\d*)/g, (m, i) => {
            if (i == "$")
              return "$";
            let n = +(i || 1);
            return !n || n > insert2.length ? m : insert2[n - 1];
          });
        return phrase;
      }
      /**
      Find the values for a given language data field, provided by the
      the [`languageData`](https://codemirror.net/6/docs/ref/#state.EditorState^languageData) facet.
      
      Examples of language data fields are...
      
      - [`"commentTokens"`](https://codemirror.net/6/docs/ref/#commands.CommentTokens) for specifying
        comment syntax.
      - [`"autocomplete"`](https://codemirror.net/6/docs/ref/#autocomplete.autocompletion^config.override)
        for providing language-specific completion sources.
      - [`"wordChars"`](https://codemirror.net/6/docs/ref/#state.EditorState.charCategorizer) for adding
        characters that should be considered part of words in this
        language.
      - [`"closeBrackets"`](https://codemirror.net/6/docs/ref/#autocomplete.CloseBracketConfig) controls
        bracket closing behavior.
      */
      languageDataAt(name, pos, side = -1) {
        let values = [];
        for (let provider of this.facet(languageData)) {
          for (let result of provider(this, pos, side)) {
            if (Object.prototype.hasOwnProperty.call(result, name))
              values.push(result[name]);
          }
        }
        return values;
      }
      /**
      Return a function that can categorize strings (expected to
      represent a single [grapheme cluster](https://codemirror.net/6/docs/ref/#state.findClusterBreak))
      into one of:
      
       - Word (contains an alphanumeric character or a character
         explicitly listed in the local language's `"wordChars"`
         language data, which should be a string)
       - Space (contains only whitespace)
       - Other (anything else)
      */
      charCategorizer(at) {
        let chars = this.languageDataAt("wordChars", at);
        return makeCategorizer(chars.length ? chars[0] : "");
      }
      /**
      Find the word at the given position, meaning the range
      containing all [word](https://codemirror.net/6/docs/ref/#state.CharCategory.Word) characters
      around it. If no word characters are adjacent to the position,
      this returns null.
      */
      wordAt(pos) {
        let { text, from, length } = this.doc.lineAt(pos);
        let cat = this.charCategorizer(pos);
        let start2 = pos - from, end = pos - from;
        while (start2 > 0) {
          let prev = findClusterBreak(text, start2, false);
          if (cat(text.slice(prev, start2)) != exports2.CharCategory.Word)
            break;
          start2 = prev;
        }
        while (end < length) {
          let next = findClusterBreak(text, end);
          if (cat(text.slice(end, next)) != exports2.CharCategory.Word)
            break;
          end = next;
        }
        return start2 == end ? null : EditorSelection.range(start2 + from, end + from);
      }
    };
    EditorState.allowMultipleSelections = allowMultipleSelections;
    EditorState.tabSize = Facet.define({
      combine: (values) => values.length ? values[0] : 4
    });
    EditorState.lineSeparator = lineSeparator;
    EditorState.readOnly = readOnly;
    EditorState.phrases = Facet.define({
      compare(a, b) {
        let kA = Object.keys(a), kB = Object.keys(b);
        return kA.length == kB.length && kA.every((k) => a[k] == b[k]);
      }
    });
    EditorState.languageData = languageData;
    EditorState.changeFilter = changeFilter;
    EditorState.transactionFilter = transactionFilter;
    EditorState.transactionExtender = transactionExtender;
    Compartment.reconfigure = StateEffect.define();
    function combineConfig(configs, defaults, combine = {}) {
      let result = {};
      for (let config2 of configs)
        for (let key of Object.keys(config2)) {
          let value = config2[key], current = result[key];
          if (current === void 0)
            result[key] = value;
          else if (current === value || value === void 0) ;
          else if (Object.hasOwnProperty.call(combine, key))
            result[key] = combine[key](current, value);
          else
            throw new Error("Config merge conflict for field " + key);
        }
      for (let key in defaults)
        if (result[key] === void 0)
          result[key] = defaults[key];
      return result;
    }
    var RangeValue = class {
      /**
      Compare this value with another value. Used when comparing
      rangesets. The default implementation compares by identity.
      Unless you are only creating a fixed number of unique instances
      of your value type, it is a good idea to implement this
      properly.
      */
      eq(other) {
        return this == other;
      }
      /**
      Create a [range](https://codemirror.net/6/docs/ref/#state.Range) with this value.
      */
      range(from, to = from) {
        return Range.create(from, to, this);
      }
    };
    RangeValue.prototype.startSide = RangeValue.prototype.endSide = 0;
    RangeValue.prototype.point = false;
    RangeValue.prototype.mapMode = exports2.MapMode.TrackDel;
    function cmpVal(a, b) {
      return a == b || a.constructor == b.constructor && a.eq(b);
    }
    var Range = class _Range {
      constructor(from, to, value) {
        this.from = from;
        this.to = to;
        this.value = value;
      }
      /**
      @internal
      */
      static create(from, to, value) {
        return new _Range(from, to, value);
      }
    };
    function cmpRange(a, b) {
      return a.from - b.from || a.value.startSide - b.value.startSide;
    }
    var Chunk = class _Chunk {
      constructor(from, to, value, maxPoint) {
        this.from = from;
        this.to = to;
        this.value = value;
        this.maxPoint = maxPoint;
      }
      get length() {
        return last(this.to);
      }
      // Find the index of the given position and side. Use the ranges'
      // `from` pos when `end == false`, `to` when `end == true`.
      findIndex(pos, side, end, startAt = 0) {
        let arr = end ? this.to : this.from;
        for (let lo = startAt, hi = arr.length; ; ) {
          if (lo == hi)
            return lo;
          let mid = lo + hi >> 1;
          let diff = arr[mid] - pos || (end ? this.value[mid].endSide : this.value[mid].startSide) - side;
          if (mid == lo)
            return diff >= 0 ? lo : hi;
          if (diff >= 0)
            hi = mid;
          else
            lo = mid + 1;
        }
      }
      between(offset, from, to, f) {
        for (let i = this.findIndex(from, -1e9, true), e = this.findIndex(to, 1e9, false, i); i < e; i++)
          if (f(this.from[i] + offset, this.to[i] + offset, this.value[i]) === false)
            return false;
      }
      map(offset, changes, basePos, baseSide, spill) {
        let value = [], from = [], to = [], newPos = -1, maxPoint = -1;
        iter: for (let i = 0; i < this.value.length; i++) {
          let val = this.value[i], curFrom = this.from[i] + offset, curTo = this.to[i] + offset, newFrom, newTo;
          if (curFrom == curTo) {
            let mapped = changes.mapPos(curFrom, val.startSide, val.mapMode);
            if (mapped == null)
              continue;
            newFrom = newTo = mapped;
            if (val.startSide != val.endSide) {
              newTo = changes.mapPos(curFrom, val.endSide);
              if (newTo < newFrom)
                continue;
            }
          } else {
            newFrom = changes.mapPos(curFrom, val.startSide);
            newTo = changes.mapPos(curTo, val.endSide);
            if (newFrom > newTo || newFrom == newTo && val.startSide > 0 && val.endSide <= 0)
              continue;
          }
          if ((newTo - newFrom || val.endSide - val.startSide) < 0)
            continue;
          if (newPos < 0)
            newPos = newFrom;
          if (val.point)
            maxPoint = Math.max(maxPoint, newTo - newFrom);
          if ((newFrom - basePos || val.startSide - baseSide) >= 0) {
            value.push(val);
            from.push(newFrom - newPos);
            to.push(newTo - newPos);
            basePos = newTo;
            baseSide = val.endSide;
          } else {
            if (newFrom == newTo) {
              for (let i2 = value.length; i2 > 0; i2--) {
                if ((newFrom - (to[i2 - 1] + newPos) || val.startSide - value[i2 - 1].endSide) >= 0) {
                  value.splice(i2, 0, val);
                  from.splice(i2, 0, newFrom - newPos);
                  to.splice(i2, 0, newTo - newPos);
                  continue iter;
                }
                if ((newFrom - (from[i2 - 1] + newPos) || val.endSide - value[i2 - 1].startSide) > 0)
                  break;
              }
            }
            spill(newFrom, newTo, val);
          }
        }
        return { mapped: value.length ? new _Chunk(from, to, value, maxPoint) : null, pos: newPos };
      }
    };
    var RangeSet = class _RangeSet {
      constructor(chunkPos, chunk, nextLayer, maxPoint) {
        this.chunkPos = chunkPos;
        this.chunk = chunk;
        this.nextLayer = nextLayer;
        this.maxPoint = maxPoint;
      }
      /**
      @internal
      */
      static create(chunkPos, chunk, nextLayer, maxPoint) {
        return new _RangeSet(chunkPos, chunk, nextLayer, maxPoint);
      }
      /**
      @internal
      */
      get length() {
        let last2 = this.chunk.length - 1;
        return last2 < 0 ? 0 : Math.max(this.chunkEnd(last2), this.nextLayer.length);
      }
      /**
      The number of ranges in the set.
      */
      get size() {
        if (this.isEmpty)
          return 0;
        let size = this.nextLayer.size;
        for (let chunk of this.chunk)
          size += chunk.value.length;
        return size;
      }
      /**
      @internal
      */
      chunkEnd(index) {
        return this.chunkPos[index] + this.chunk[index].length;
      }
      /**
      Update the range set, optionally adding new ranges or filtering
      out existing ones.
      
      (Note: The type parameter is just there as a kludge to work
      around TypeScript variance issues that prevented `RangeSet<X>`
      from being a subtype of `RangeSet<Y>` when `X` is a subtype of
      `Y`.)
      */
      update(updateSpec) {
        let { add = [], sort = false, filterFrom = 0, filterTo = this.length } = updateSpec;
        let filter = updateSpec.filter;
        if (add.length == 0 && !filter)
          return this;
        if (sort)
          add = add.slice().sort(cmpRange);
        if (this.isEmpty)
          return add.length ? _RangeSet.of(add) : this;
        let cur = new LayerCursor(this, null, -1).goto(0), i = 0, spill = [];
        let builder = new RangeSetBuilder();
        while (cur.value || i < add.length) {
          if (i < add.length && (cur.from - add[i].from || cur.startSide - add[i].value.startSide) >= 0) {
            let range = add[i++];
            if (!builder.addInner(range.from, range.to, range.value, false))
              spill.push(range);
          } else if (cur.rangeIndex == 1 && cur.chunkIndex < this.chunk.length && (i == add.length || this.chunkEnd(cur.chunkIndex) < add[i].from) && (!filter || filterFrom > this.chunkEnd(cur.chunkIndex) || filterTo < this.chunkPos[cur.chunkIndex]) && builder.addChunk(this.chunkPos[cur.chunkIndex], this.chunk[cur.chunkIndex])) {
            cur.nextChunk();
          } else {
            if (!filter || filterFrom > cur.to || filterTo < cur.from || filter(cur.from, cur.to, cur.value)) {
              if (!builder.addInner(cur.from, cur.to, cur.value, false))
                spill.push(Range.create(cur.from, cur.to, cur.value));
            }
            cur.next();
          }
        }
        return builder.finishInner(this.nextLayer.isEmpty && !spill.length ? _RangeSet.empty : this.nextLayer.update({ add: spill, filter, filterFrom, filterTo }));
      }
      /**
      Map this range set through a set of changes, return the new set.
      */
      map(changes) {
        if (changes.empty || this.isEmpty)
          return this;
        let chunks = [], chunkPos = [], maxPoint = -1;
        let spilled;
        let spill = (from, to, value) => {
          if (!spilled)
            spilled = new RangeSetBuilder();
          spilled.addRange(from, to, value, false);
        };
        for (let i = 0; i < this.chunk.length; i++) {
          let start2 = this.chunkPos[i], chunk = this.chunk[i];
          let touch = changes.touchesRange(start2, start2 + chunk.length);
          if (touch === false) {
            maxPoint = Math.max(maxPoint, chunk.maxPoint);
            chunks.push(chunk);
            chunkPos.push(changes.mapPos(start2));
          } else if (touch === true) {
            let [prevPos, prevSide] = !chunks.length ? [-1, -1] : [last(chunkPos) + last(chunks).length, last(last(chunks).value).endSide];
            let { mapped, pos } = chunk.map(start2, changes, prevPos, prevSide, spill);
            if (mapped) {
              maxPoint = Math.max(maxPoint, mapped.maxPoint);
              chunks.push(mapped);
              chunkPos.push(pos);
            }
          }
        }
        let next = this.nextLayer.map(changes);
        if (spilled)
          next = spilled.finishInner(next);
        return chunks.length == 0 ? next : new _RangeSet(chunkPos, chunks, next || _RangeSet.empty, maxPoint);
      }
      /**
      Iterate over the ranges that touch the region `from` to `to`,
      calling `f` for each. There is no guarantee that the ranges will
      be reported in any specific order. When the callback returns
      `false`, iteration stops.
      */
      between(from, to, f) {
        if (this.isEmpty)
          return;
        for (let i = 0; i < this.chunk.length; i++) {
          let start2 = this.chunkPos[i], chunk = this.chunk[i];
          if (to >= start2 && from <= start2 + chunk.length && chunk.between(start2, from - start2, to - start2, f) === false)
            return;
        }
        this.nextLayer.between(from, to, f);
      }
      /**
      Iterate over the ranges in this set, in order, including all
      ranges that end at or after `from`.
      */
      iter(from = 0) {
        return HeapCursor.from([this]).goto(from);
      }
      /**
      @internal
      */
      get isEmpty() {
        return this.nextLayer == this;
      }
      /**
      Iterate over the ranges in a collection of sets, in order,
      starting from `from`.
      */
      static iter(sets, from = 0) {
        return HeapCursor.from(sets).goto(from);
      }
      /**
      Iterate over two groups of sets, calling methods on `comparator`
      to notify it of possible differences.
      */
      static compare(oldSets, newSets, textDiff, comparator, minPointSize = -1) {
        let a = oldSets.filter((set) => set.maxPoint > 0 || !set.isEmpty && set.maxPoint >= minPointSize);
        let b = newSets.filter((set) => set.maxPoint > 0 || !set.isEmpty && set.maxPoint >= minPointSize);
        let sharedChunks = findSharedChunks(a, b, textDiff);
        let sideA = new SpanCursor(a, sharedChunks, minPointSize);
        let sideB = new SpanCursor(b, sharedChunks, minPointSize);
        textDiff.iterGaps((fromA, fromB, length) => compare(sideA, fromA, sideB, fromB, length, comparator));
        if (textDiff.empty && textDiff.length == 0)
          compare(sideA, 0, sideB, 0, 0, comparator);
      }
      /**
      Compare the contents of two groups of range sets, returning true
      if they are equivalent in the given range.
      */
      static eq(oldSets, newSets, from = 0, to) {
        if (to == null)
          to = 1e9 - 1;
        let a = oldSets.filter((set) => !set.isEmpty && newSets.indexOf(set) < 0);
        let b = newSets.filter((set) => !set.isEmpty && oldSets.indexOf(set) < 0);
        if (a.length != b.length)
          return false;
        if (!a.length)
          return true;
        let sharedChunks = findSharedChunks(a, b);
        let sideA = new SpanCursor(a, sharedChunks, 0).goto(from), sideB = new SpanCursor(b, sharedChunks, 0).goto(from);
        for (; ; ) {
          if (sideA.to != sideB.to || !sameValues(sideA.active, sideB.active) || sideA.point && (!sideB.point || !cmpVal(sideA.point, sideB.point)))
            return false;
          if (sideA.to > to)
            return true;
          sideA.next();
          sideB.next();
        }
      }
      /**
      Iterate over a group of range sets at the same time, notifying
      the iterator about the ranges covering every given piece of
      content. Returns the open count (see
      [`SpanIterator.span`](https://codemirror.net/6/docs/ref/#state.SpanIterator.span)) at the end
      of the iteration.
      */
      static spans(sets, from, to, iterator, minPointSize = -1) {
        let cursor = new SpanCursor(sets, null, minPointSize).goto(from), pos = from;
        let openRanges = cursor.openStart;
        for (; ; ) {
          let curTo = Math.min(cursor.to, to);
          if (cursor.point) {
            let active = cursor.activeForPoint(cursor.to);
            let openCount = cursor.pointFrom < from ? active.length + 1 : cursor.point.startSide < 0 ? active.length : Math.min(active.length, openRanges);
            iterator.point(pos, curTo, cursor.point, active, openCount, cursor.pointRank);
            openRanges = Math.min(cursor.openEnd(curTo), active.length);
          } else if (curTo > pos) {
            iterator.span(pos, curTo, cursor.active, openRanges);
            openRanges = cursor.openEnd(curTo);
          }
          if (cursor.to > to)
            return openRanges + (cursor.point && cursor.to > to ? 1 : 0);
          pos = cursor.to;
          cursor.next();
        }
      }
      /**
      Create a range set for the given range or array of ranges. By
      default, this expects the ranges to be _sorted_ (by start
      position and, if two start at the same position,
      `value.startSide`). You can pass `true` as second argument to
      cause the method to sort them.
      */
      static of(ranges, sort = false) {
        let build = new RangeSetBuilder();
        for (let range of ranges instanceof Range ? [ranges] : sort ? lazySort(ranges) : ranges)
          build.add(range.from, range.to, range.value);
        return build.finish();
      }
      /**
      Join an array of range sets into a single set.
      */
      static join(sets) {
        if (!sets.length)
          return _RangeSet.empty;
        let result = last(sets);
        for (let i = sets.length - 2; i >= 0; i--) {
          for (let layer = sets[i]; layer != _RangeSet.empty; layer = layer.nextLayer)
            result = new _RangeSet(layer.chunkPos, layer.chunk, result, Math.max(layer.maxPoint, result.maxPoint));
        }
        return result;
      }
    };
    RangeSet.empty = new RangeSet([], [], null, -1);
    function last(arr) {
      return arr[arr.length - 1];
    }
    function lazySort(ranges) {
      if (ranges.length > 1)
        for (let prev = ranges[0], i = 1; i < ranges.length; i++) {
          let cur = ranges[i];
          if (cmpRange(prev, cur) > 0)
            return ranges.slice().sort(cmpRange);
          prev = cur;
        }
      return ranges;
    }
    RangeSet.empty.nextLayer = RangeSet.empty;
    var RangeSetBuilder = class _RangeSetBuilder {
      finishChunk(newArrays) {
        this.chunks.push(new Chunk(this.from, this.to, this.value, this.maxPoint));
        this.chunkPos.push(this.chunkStart);
        this.chunkStart = -1;
        this.setMaxPoint = Math.max(this.setMaxPoint, this.maxPoint);
        this.maxPoint = -1;
        if (newArrays) {
          this.from = [];
          this.to = [];
          this.value = [];
        }
      }
      /**
      Create an empty builder.
      */
      constructor() {
        this.chunks = [];
        this.chunkPos = [];
        this.chunkStart = -1;
        this.last = null;
        this.lastFrom = -1e9;
        this.lastTo = -1e9;
        this.from = [];
        this.to = [];
        this.value = [];
        this.maxPoint = -1;
        this.setMaxPoint = -1;
        this.nextLayer = null;
      }
      /**
      Add a range. Ranges should be added in sorted (by `from` and
      `value.startSide`) order.
      */
      add(from, to, value) {
        this.addRange(from, to, value, true);
      }
      /**
      @internal
      */
      addRange(from, to, value, strict) {
        if (!this.addInner(from, to, value, strict))
          (this.nextLayer || (this.nextLayer = new _RangeSetBuilder())).addRange(from, to, value, strict);
      }
      /**
      @internal
      */
      addInner(from, to, value, strict) {
        let diff = from - this.lastTo || value.startSide - this.last.endSide;
        if (strict && diff <= 0 && (from - this.lastFrom || value.startSide - this.last.startSide) < 0)
          throw new Error("Ranges must be added sorted by `from` position and `startSide`");
        if (diff < 0)
          return false;
        if (this.from.length == 250)
          this.finishChunk(true);
        if (this.chunkStart < 0)
          this.chunkStart = from;
        this.from.push(from - this.chunkStart);
        this.to.push(to - this.chunkStart);
        this.last = value;
        this.lastFrom = from;
        this.lastTo = to;
        this.value.push(value);
        if (value.point)
          this.maxPoint = Math.max(this.maxPoint, to - from);
        return true;
      }
      /**
      @internal
      */
      addChunk(from, chunk) {
        if ((from - this.lastTo || chunk.value[0].startSide - this.last.endSide) < 0)
          return false;
        if (this.from.length)
          this.finishChunk(true);
        this.setMaxPoint = Math.max(this.setMaxPoint, chunk.maxPoint);
        this.chunks.push(chunk);
        this.chunkPos.push(from);
        let last2 = chunk.value.length - 1;
        this.last = chunk.value[last2];
        this.lastFrom = chunk.from[last2] + from;
        this.lastTo = chunk.to[last2] + from;
        return true;
      }
      /**
      Finish the range set. Returns the new set. The builder can't be
      used anymore after this has been called.
      */
      finish() {
        return this.finishInner(RangeSet.empty);
      }
      /**
      @internal
      */
      finishInner(next) {
        if (this.from.length)
          this.finishChunk(false);
        if (this.chunks.length == 0)
          return next;
        let result = RangeSet.create(this.chunkPos, this.chunks, this.nextLayer ? this.nextLayer.finishInner(next) : next, this.setMaxPoint);
        this.from = null;
        return result;
      }
    };
    function findSharedChunks(a, b, textDiff) {
      let inA = /* @__PURE__ */ new Map();
      for (let set of a)
        for (let i = 0; i < set.chunk.length; i++)
          if (set.chunk[i].maxPoint <= 0)
            inA.set(set.chunk[i], set.chunkPos[i]);
      let shared = /* @__PURE__ */ new Set();
      for (let set of b)
        for (let i = 0; i < set.chunk.length; i++) {
          let known = inA.get(set.chunk[i]);
          if (known != null && (textDiff ? textDiff.mapPos(known) : known) == set.chunkPos[i] && !(textDiff === null || textDiff === void 0 ? void 0 : textDiff.touchesRange(known, known + set.chunk[i].length)))
            shared.add(set.chunk[i]);
        }
      return shared;
    }
    var LayerCursor = class {
      constructor(layer, skip, minPoint, rank = 0) {
        this.layer = layer;
        this.skip = skip;
        this.minPoint = minPoint;
        this.rank = rank;
      }
      get startSide() {
        return this.value ? this.value.startSide : 0;
      }
      get endSide() {
        return this.value ? this.value.endSide : 0;
      }
      goto(pos, side = -1e9) {
        this.chunkIndex = this.rangeIndex = 0;
        this.gotoInner(pos, side, false);
        return this;
      }
      gotoInner(pos, side, forward) {
        while (this.chunkIndex < this.layer.chunk.length) {
          let next = this.layer.chunk[this.chunkIndex];
          if (!(this.skip && this.skip.has(next) || this.layer.chunkEnd(this.chunkIndex) < pos || next.maxPoint < this.minPoint))
            break;
          this.chunkIndex++;
          forward = false;
        }
        if (this.chunkIndex < this.layer.chunk.length) {
          let rangeIndex = this.layer.chunk[this.chunkIndex].findIndex(pos - this.layer.chunkPos[this.chunkIndex], side, true);
          if (!forward || this.rangeIndex < rangeIndex)
            this.setRangeIndex(rangeIndex);
        }
        this.next();
      }
      forward(pos, side) {
        if ((this.to - pos || this.endSide - side) < 0)
          this.gotoInner(pos, side, true);
      }
      next() {
        for (; ; ) {
          if (this.chunkIndex == this.layer.chunk.length) {
            this.from = this.to = 1e9;
            this.value = null;
            break;
          } else {
            let chunkPos = this.layer.chunkPos[this.chunkIndex], chunk = this.layer.chunk[this.chunkIndex];
            let from = chunkPos + chunk.from[this.rangeIndex];
            this.from = from;
            this.to = chunkPos + chunk.to[this.rangeIndex];
            this.value = chunk.value[this.rangeIndex];
            this.setRangeIndex(this.rangeIndex + 1);
            if (this.minPoint < 0 || this.value.point && this.to - this.from >= this.minPoint)
              break;
          }
        }
      }
      setRangeIndex(index) {
        if (index == this.layer.chunk[this.chunkIndex].value.length) {
          this.chunkIndex++;
          if (this.skip) {
            while (this.chunkIndex < this.layer.chunk.length && this.skip.has(this.layer.chunk[this.chunkIndex]))
              this.chunkIndex++;
          }
          this.rangeIndex = 0;
        } else {
          this.rangeIndex = index;
        }
      }
      nextChunk() {
        this.chunkIndex++;
        this.rangeIndex = 0;
        this.next();
      }
      compare(other) {
        return this.from - other.from || this.startSide - other.startSide || this.rank - other.rank || this.to - other.to || this.endSide - other.endSide;
      }
    };
    var HeapCursor = class _HeapCursor {
      constructor(heap) {
        this.heap = heap;
      }
      static from(sets, skip = null, minPoint = -1) {
        let heap = [];
        for (let i = 0; i < sets.length; i++) {
          for (let cur = sets[i]; !cur.isEmpty; cur = cur.nextLayer) {
            if (cur.maxPoint >= minPoint)
              heap.push(new LayerCursor(cur, skip, minPoint, i));
          }
        }
        return heap.length == 1 ? heap[0] : new _HeapCursor(heap);
      }
      get startSide() {
        return this.value ? this.value.startSide : 0;
      }
      goto(pos, side = -1e9) {
        for (let cur of this.heap)
          cur.goto(pos, side);
        for (let i = this.heap.length >> 1; i >= 0; i--)
          heapBubble(this.heap, i);
        this.next();
        return this;
      }
      forward(pos, side) {
        for (let cur of this.heap)
          cur.forward(pos, side);
        for (let i = this.heap.length >> 1; i >= 0; i--)
          heapBubble(this.heap, i);
        if ((this.to - pos || this.value.endSide - side) < 0)
          this.next();
      }
      next() {
        if (this.heap.length == 0) {
          this.from = this.to = 1e9;
          this.value = null;
          this.rank = -1;
        } else {
          let top = this.heap[0];
          this.from = top.from;
          this.to = top.to;
          this.value = top.value;
          this.rank = top.rank;
          if (top.value)
            top.next();
          heapBubble(this.heap, 0);
        }
      }
    };
    function heapBubble(heap, index) {
      for (let cur = heap[index]; ; ) {
        let childIndex = (index << 1) + 1;
        if (childIndex >= heap.length)
          break;
        let child = heap[childIndex];
        if (childIndex + 1 < heap.length && child.compare(heap[childIndex + 1]) >= 0) {
          child = heap[childIndex + 1];
          childIndex++;
        }
        if (cur.compare(child) < 0)
          break;
        heap[childIndex] = cur;
        heap[index] = child;
        index = childIndex;
      }
    }
    var SpanCursor = class {
      constructor(sets, skip, minPoint) {
        this.minPoint = minPoint;
        this.active = [];
        this.activeTo = [];
        this.activeRank = [];
        this.minActive = -1;
        this.point = null;
        this.pointFrom = 0;
        this.pointRank = 0;
        this.to = -1e9;
        this.endSide = 0;
        this.openStart = -1;
        this.cursor = HeapCursor.from(sets, skip, minPoint);
      }
      goto(pos, side = -1e9) {
        this.cursor.goto(pos, side);
        this.active.length = this.activeTo.length = this.activeRank.length = 0;
        this.minActive = -1;
        this.to = pos;
        this.endSide = side;
        this.openStart = -1;
        this.next();
        return this;
      }
      forward(pos, side) {
        while (this.minActive > -1 && (this.activeTo[this.minActive] - pos || this.active[this.minActive].endSide - side) < 0)
          this.removeActive(this.minActive);
        this.cursor.forward(pos, side);
      }
      removeActive(index) {
        remove(this.active, index);
        remove(this.activeTo, index);
        remove(this.activeRank, index);
        this.minActive = findMinIndex(this.active, this.activeTo);
      }
      addActive(trackOpen) {
        let i = 0, { value, to, rank } = this.cursor;
        while (i < this.activeRank.length && (rank - this.activeRank[i] || to - this.activeTo[i]) > 0)
          i++;
        insert(this.active, i, value);
        insert(this.activeTo, i, to);
        insert(this.activeRank, i, rank);
        if (trackOpen)
          insert(trackOpen, i, this.cursor.from);
        this.minActive = findMinIndex(this.active, this.activeTo);
      }
      // After calling this, if `this.point` != null, the next range is a
      // point. Otherwise, it's a regular range, covered by `this.active`.
      next() {
        let from = this.to, wasPoint = this.point;
        this.point = null;
        let trackOpen = this.openStart < 0 ? [] : null;
        for (; ; ) {
          let a = this.minActive;
          if (a > -1 && (this.activeTo[a] - this.cursor.from || this.active[a].endSide - this.cursor.startSide) < 0) {
            if (this.activeTo[a] > from) {
              this.to = this.activeTo[a];
              this.endSide = this.active[a].endSide;
              break;
            }
            this.removeActive(a);
            if (trackOpen)
              remove(trackOpen, a);
          } else if (!this.cursor.value) {
            this.to = this.endSide = 1e9;
            break;
          } else if (this.cursor.from > from) {
            this.to = this.cursor.from;
            this.endSide = this.cursor.startSide;
            break;
          } else {
            let nextVal = this.cursor.value;
            if (!nextVal.point) {
              this.addActive(trackOpen);
              this.cursor.next();
            } else if (wasPoint && this.cursor.to == this.to && this.cursor.from < this.cursor.to) {
              this.cursor.next();
            } else {
              this.point = nextVal;
              this.pointFrom = this.cursor.from;
              this.pointRank = this.cursor.rank;
              this.to = this.cursor.to;
              this.endSide = nextVal.endSide;
              this.cursor.next();
              this.forward(this.to, this.endSide);
              break;
            }
          }
        }
        if (trackOpen) {
          this.openStart = 0;
          for (let i = trackOpen.length - 1; i >= 0 && trackOpen[i] < from; i--)
            this.openStart++;
        }
      }
      activeForPoint(to) {
        if (!this.active.length)
          return this.active;
        let active = [];
        for (let i = this.active.length - 1; i >= 0; i--) {
          if (this.activeRank[i] < this.pointRank)
            break;
          if (this.activeTo[i] > to || this.activeTo[i] == to && this.active[i].endSide >= this.point.endSide)
            active.push(this.active[i]);
        }
        return active.reverse();
      }
      openEnd(to) {
        let open = 0;
        for (let i = this.activeTo.length - 1; i >= 0 && this.activeTo[i] > to; i--)
          open++;
        return open;
      }
    };
    function compare(a, startA, b, startB, length, comparator) {
      a.goto(startA);
      b.goto(startB);
      let endB = startB + length;
      let pos = startB, dPos = startB - startA;
      let bounds = !!comparator.boundChange;
      for (let boundChange = false; ; ) {
        let dEnd = a.to + dPos - b.to, diff = dEnd || a.endSide - b.endSide;
        let end = diff < 0 ? a.to + dPos : b.to, clipEnd = Math.min(end, endB);
        let point = a.point || b.point;
        if (point) {
          if (!(a.point && b.point && cmpVal(a.point, b.point) && sameValues(a.activeForPoint(a.to), b.activeForPoint(b.to))))
            comparator.comparePoint(pos, clipEnd, a.point, b.point);
          boundChange = false;
        } else {
          if (boundChange) {
            comparator.boundChange(pos);
            boundChange = false;
          }
          if (clipEnd > pos && !sameValues(a.active, b.active))
            comparator.compareRange(pos, clipEnd, a.active, b.active);
          if (bounds && clipEnd < endB && (dEnd || a.openEnd(end) != b.openEnd(end)))
            boundChange = true;
        }
        if (end > endB)
          break;
        pos = end;
        if (diff <= 0)
          a.next();
        if (diff >= 0)
          b.next();
      }
    }
    function sameValues(a, b) {
      if (a.length != b.length)
        return false;
      for (let i = 0; i < a.length; i++)
        if (a[i] != b[i] && !cmpVal(a[i], b[i]))
          return false;
      return true;
    }
    function remove(array, index) {
      for (let i = index, e = array.length - 1; i < e; i++)
        array[i] = array[i + 1];
      array.pop();
    }
    function insert(array, index, value) {
      for (let i = array.length - 1; i >= index; i--)
        array[i + 1] = array[i];
      array[index] = value;
    }
    function findMinIndex(value, array) {
      let found = -1, foundPos = 1e9;
      for (let i = 0; i < array.length; i++)
        if ((array[i] - foundPos || value[i].endSide - value[found].endSide) < 0) {
          found = i;
          foundPos = array[i];
        }
      return found;
    }
    function countColumn(string, tabSize, to = string.length) {
      let n = 0;
      for (let i = 0; i < to && i < string.length; ) {
        if (string.charCodeAt(i) == 9) {
          n += tabSize - n % tabSize;
          i++;
        } else {
          n++;
          i = findClusterBreak(string, i);
        }
      }
      return n;
    }
    function findColumn(string, col, tabSize, strict) {
      for (let i = 0, n = 0; ; ) {
        if (n >= col)
          return i;
        if (i == string.length)
          break;
        n += string.charCodeAt(i) == 9 ? tabSize - n % tabSize : 1;
        i = findClusterBreak(string, i);
      }
      return strict === true ? -1 : string.length;
    }
    exports2.Annotation = Annotation;
    exports2.AnnotationType = AnnotationType;
    exports2.ChangeDesc = ChangeDesc;
    exports2.ChangeSet = ChangeSet;
    exports2.Compartment = Compartment;
    exports2.EditorSelection = EditorSelection;
    exports2.EditorState = EditorState;
    exports2.Facet = Facet;
    exports2.Line = Line;
    exports2.Prec = Prec;
    exports2.Range = Range;
    exports2.RangeSet = RangeSet;
    exports2.RangeSetBuilder = RangeSetBuilder;
    exports2.RangeValue = RangeValue;
    exports2.SelectionRange = SelectionRange;
    exports2.StateEffect = StateEffect;
    exports2.StateEffectType = StateEffectType;
    exports2.StateField = StateField;
    exports2.Text = Text;
    exports2.Transaction = Transaction;
    exports2.codePointAt = codePointAt;
    exports2.codePointSize = codePointSize;
    exports2.combineConfig = combineConfig;
    exports2.countColumn = countColumn;
    exports2.findClusterBreak = findClusterBreak;
    exports2.findColumn = findColumn;
    exports2.fromCodePoint = fromCodePoint;
  }
});

// src/server.js
var require_server = __commonJS({
  "src/server.js"(exports2, module2) {
    "use strict";
    var http = require("http");
    var fs = require("fs");
    var path = require("path");
    var os = require("os");
    var crypto = require("crypto");
    var { ChangeSet, Text } = require_dist2();
    var STATIC = {
      "/": ["index.html", "text/html; charset=utf-8"],
      "/index.html": ["index.html", "text/html; charset=utf-8"],
      "/app.js": ["app.js", "text/javascript; charset=utf-8"],
      "/app.css": ["app.css", "text/css; charset=utf-8"],
      "/icon.svg": ["icon.svg", "image/svg+xml"],
      "/manifest.webmanifest": ["manifest.webmanifest", "application/manifest+json"]
    };
    var SECURITY_HEADERS = {
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-store"
    };
    var MAX_BODY = 10 * 1024 * 1024;
    var MAX_DOC_CHARS = 5 * 1024 * 1024;
    var MAX_FAILS = 10;
    var BLOCK_MS = 15 * 60 * 1e3;
    var BUILTIN_COMMANDS = [
      ["editor.action.formatDocument", "Format Document"],
      ["editor.action.organizeImports", "Organize Imports"],
      ["editor.action.fixAll", "Fix All"],
      ["editor.action.sourceAction", "Source Action..."],
      ["workbench.action.files.saveAll", "Save All"],
      ["workbench.action.files.revert", "Revert File (discard unsaved changes)"],
      ["editor.action.trimTrailingWhitespace", "Trim Trailing Whitespace"],
      ["editor.action.transformToUppercase", "Transform to Uppercase"],
      ["editor.action.transformToLowercase", "Transform to Lowercase"]
    ];
    var HISTORY = 500;
    var FILE_EXCLUDE = "**/{node_modules,.git,dist,out,build,.next,.nuxt,.venv,venv,__pycache__,target,.gradle,Pods}/**";
    var normalize = (s) => s.replace(/\r\n?/g, "\n");
    var toText = (s) => Text.of(normalize(s).split("\n"));
    var sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
    var SyncServer2 = class {
      constructor(vscode2, opts) {
        this.vscode = vscode2;
        this.opts = opts;
        this.clients = /* @__PURE__ */ new Map();
        this.watched = /* @__PURE__ */ new Map();
        this.pendingOrigin = /* @__PURE__ */ new Map();
        this.fails = /* @__PURE__ */ new Map();
        this.disposables = [];
        this.listening = false;
        this.tokenHash = sha(opts.token);
        this.http = http.createServer((req, res) => this.handle(req, res).catch((err) => this.fail(res, 500, err.message)));
      }
      // ---------- lifecycle ----------
      listen() {
        return new Promise((resolve, reject) => {
          this.http.once("error", reject);
          this.http.listen(this.opts.port, this.opts.host, () => {
            this.http.off("error", reject);
            this.listening = true;
            this.port = this.http.address().port;
            this.hookEvents();
            this.keepAlive = setInterval(() => this.broadcastRaw(": ping\n\n"), 2e4);
            resolve();
          });
        });
      }
      close() {
        this.listening = false;
        clearInterval(this.keepAlive);
        for (const d of this.disposables) d.dispose();
        this.disposables = [];
        for (const c of this.clients.values()) c.res.end();
        this.clients.clear();
        return new Promise((resolve) => this.http.close(() => resolve()));
      }
      clientCount() {
        return this.clients.size;
      }
      urls() {
        const out = [];
        const host = this.opts.host;
        const addTo = (ip, label) => out.push({ label, url: `http://${ip}:${this.port}/#t=${encodeURIComponent(this.opts.token)}` });
        if (host && host !== "0.0.0.0" && host !== "::") {
          addTo(host, "Address");
          return out;
        }
        for (const list of Object.values(os.networkInterfaces())) {
          for (const a of list || []) {
            if (a.family !== "IPv4" && a.family !== 4) continue;
            if (a.internal) continue;
            const [x, y] = a.address.split(".").map(Number);
            const tailscale = x === 100 && y >= 64 && y <= 127;
            addTo(a.address, tailscale ? "Tailscale (\u0E43\u0E0A\u0E49\u0E19\u0E2D\u0E01\u0E1A\u0E49\u0E32\u0E19\u0E44\u0E14\u0E49)" : "Wi-Fi \u0E1A\u0E49\u0E32\u0E19 (\u0E40\u0E04\u0E23\u0E37\u0E2D\u0E02\u0E48\u0E32\u0E22\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E19)");
          }
        }
        out.sort((a, b) => (a.label.startsWith("Wi-Fi") ? -1 : 1) - (b.label.startsWith("Wi-Fi") ? -1 : 1));
        return out;
      }
      // ---------- editor -> phone ----------
      hookEvents() {
        const vs = this.vscode;
        this.disposables.push(
          vs.workspace.onDidChangeTextDocument((e) => {
            const uri = e.document.uri.toString();
            const w = this.watched.get(uri);
            if (!w) return;
            if (!e.contentChanges.length) {
              this.broadcast({ type: "dirty", uri, dirty: e.document.isDirty, version: e.document.version });
              return;
            }
            let changes;
            try {
              const specs = e.contentChanges.map((ch) => ({
                from: offsetIn(w.shadow, ch.range.start),
                to: offsetIn(w.shadow, ch.range.end),
                insert: normalize(ch.text)
              }));
              changes = ChangeSet.of(specs, w.shadow.length);
              w.shadow = changes.apply(w.shadow);
              if (!sameLength(w.shadow, e.document)) throw new Error("shadow out of sync");
            } catch {
              this.track(e.document);
              this.broadcast({ type: "reset", uri, version: e.document.version });
              return;
            }
            w.version = e.document.version;
            w.history.push({ version: w.version, changes });
            if (w.history.length > HISTORY) w.history.splice(0, w.history.length - HISTORY);
            this.broadcast({
              type: "change",
              uri,
              version: w.version,
              dirty: e.document.isDirty,
              origin: this.pendingOrigin.get(uri) || "pc",
              changes: changes.toJSON(),
              len: w.shadow.length
            });
          }),
          vs.workspace.onDidSaveTextDocument((doc) => {
            const uri = doc.uri.toString();
            if (this.watched.has(uri)) this.broadcast({ type: "dirty", uri, dirty: doc.isDirty, version: doc.version });
          }),
          vs.workspace.onDidCloseTextDocument((doc) => {
            const uri = doc.uri.toString();
            if (this.watched.delete(uri)) this.broadcast({ type: "closed", uri });
          }),
          vs.window.tabGroups.onDidChangeTabs(() => this.broadcast({ type: "tabs", tabs: this.tabs() })),
          vs.window.onDidChangeActiveTextEditor((ed) => {
            if (ed) this.broadcast({ type: "active", uri: ed.document.uri.toString() });
          })
        );
        if (vs.languages && vs.languages.onDidChangeDiagnostics) {
          this.disposables.push(
            vs.languages.onDidChangeDiagnostics((e) => {
              for (const u of e.uris) {
                const uri = u.toString();
                if (this.watched.has(uri)) this.broadcast({ type: "diag", uri, diags: this.diagnostics(u) });
              }
            })
          );
        }
      }
      tabs() {
        const vs = this.vscode;
        const out = [];
        const seen = /* @__PURE__ */ new Set();
        for (const group of vs.window.tabGroups.all) {
          for (const tab of group.tabs) {
            if (!(tab.input instanceof vs.TabInputText)) continue;
            const uri = tab.input.uri.toString();
            if (seen.has(uri)) continue;
            seen.add(uri);
            out.push({
              uri,
              label: tab.label,
              path: tab.input.uri.scheme === "file" ? vs.workspace.asRelativePath(tab.input.uri) : tab.label,
              dirty: tab.isDirty,
              active: tab.isActive && group.isActive
            });
          }
        }
        return out;
      }
      broadcast(msg) {
        this.broadcastRaw(`data: ${JSON.stringify(msg)}

`);
      }
      broadcastRaw(s) {
        for (const c of this.clients.values()) c.res.write(s);
      }
      // ---------- HTTP ----------
      async handle(req, res) {
        const url = new URL(req.url, "http://x");
        let address = (req.socket.remoteAddress || "").replace(/^::ffff:/, "");
        const viaRelay = this.opts.agentNonce && (address === "127.0.0.1" || address === "::1") && typeof req.headers["x-mobile-sync-agent"] === "string" && req.headers["x-mobile-sync-agent"].length === this.opts.agentNonce.length && crypto.timingSafeEqual(Buffer.from(req.headers["x-mobile-sync-agent"]), Buffer.from(this.opts.agentNonce));
        if (viaRelay) address = "VPS:" + String(req.headers["x-mobile-sync-remote"] || "?").slice(0, 64);
        if (req.method === "GET" && STATIC[url.pathname]) {
          const [file, type] = STATIC[url.pathname];
          const body2 = fs.readFileSync(path.join(this.opts.mediaDir, file));
          res.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": type });
          return res.end(body2);
        }
        if (!url.pathname.startsWith("/api/")) return this.fail(res, 404, "not found");
        const f = this.fails.get(address);
        if (f && f.until > Date.now()) return this.fail(res, 429, "blocked");
        const given = req.headers["x-token"] || (url.pathname === "/api/events" ? url.searchParams.get("t") : "");
        if (!given || !crypto.timingSafeEqual(sha(given), this.tokenHash)) {
          const rec = f || { count: 0, until: 0 };
          rec.count++;
          if (rec.count >= MAX_FAILS) {
            rec.until = Date.now() + BLOCK_MS;
            rec.count = 0;
            if (this.opts.onSuspicious) this.opts.onSuspicious(address);
          }
          this.fails.set(address, rec);
          return this.fail(res, 401, "wrong key");
        }
        this.fails.delete(address);
        const route = `${req.method} ${url.pathname}`;
        if (route === "GET /api/events") return this.events(req, res, url, address);
        if (route === "GET /api/tabs") return this.json(res, { tabs: this.tabs(), active: this.activeUri() });
        if (route === "GET /api/files") return this.json(res, { files: await this.files() });
        if (route === "GET /api/commands") return this.json(res, this.commandList());
        if (req.method !== "POST") return this.fail(res, 404, "not found");
        const body = await readJson(req);
        if (route === "POST /api/open") return this.json(res, await this.open(body));
        if (route === "POST /api/edit") return this.json(res, await this.edit(body));
        if (route === "POST /api/save") return this.json(res, await this.save(body));
        if (route === "POST /api/run") return this.json(res, await this.run(body));
        return this.fail(res, 404, "not found");
      }
      events(req, res, url, address) {
        const id = String(url.searchParams.get("c") || crypto.randomUUID()).slice(0, 64);
        res.writeHead(200, {
          ...SECURITY_HEADERS,
          "Content-Type": "text/event-stream; charset=utf-8",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no"
        });
        res.write(`data: ${JSON.stringify({ type: "hello", tabs: this.tabs(), active: this.activeUri() })}

`);
        const old = this.clients.get(id);
        if (old) old.res.end();
        this.clients.set(id, { res, address });
        if (this.opts.onClientsChanged) this.opts.onClientsChanged({ connected: !old, address });
        req.on("close", () => {
          if (this.clients.get(id)?.res === res) {
            this.clients.delete(id);
            if (this.opts.onClientsChanged) this.opts.onClientsChanged({ connected: false, address });
          }
        });
      }
      activeUri() {
        const ed = this.vscode.window.activeTextEditor;
        return ed ? ed.document.uri.toString() : null;
      }
      async files() {
        const vs = this.vscode;
        const uris = await vs.workspace.findFiles("**/*", FILE_EXCLUDE, 2e4);
        return uris.map((u) => ({ uri: u.toString(), path: vs.workspace.asRelativePath(u) })).sort((a, b) => a.path.localeCompare(b.path));
      }
      findDoc(uri) {
        return this.vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri);
      }
      allowed(uriStr) {
        const vs = this.vscode;
        if (this.tabs().some((t) => t.uri === uriStr)) return true;
        const uri = vs.Uri.parse(uriStr, true);
        return uri.scheme === "file" && !!vs.workspace.getWorkspaceFolder(uri);
      }
      async open({ uri }) {
        const vs = this.vscode;
        if (typeof uri !== "string" || !this.allowed(uri)) return { ok: false, error: "\u0E44\u0E1F\u0E25\u0E4C\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E42\u0E1B\u0E23\u0E40\u0E08\u0E01\u0E15\u0E4C\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E34\u0E14\u0E2D\u0E22\u0E39\u0E48" };
        let doc = this.findDoc(uri);
        if (!doc) doc = await vs.workspace.openTextDocument(vs.Uri.parse(uri, true));
        if (doc.getText().length > MAX_DOC_CHARS) return { ok: false, error: "\u0E44\u0E1F\u0E25\u0E4C\u0E43\u0E2B\u0E0D\u0E48\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B (\u0E40\u0E01\u0E34\u0E19 5 MB)" };
        if (!this.tabs().some((t) => t.uri === uri)) {
          await vs.window.showTextDocument(doc, { preview: false, preserveFocus: true });
        }
        const w = this.watched.get(uri) && this.watched.get(uri).version === doc.version ? this.watched.get(uri) : this.track(doc);
        return {
          ok: true,
          uri,
          version: w.version,
          text: w.shadow.toString(),
          languageId: doc.languageId,
          dirty: doc.isDirty,
          path: doc.uri.scheme === "file" ? vs.workspace.asRelativePath(doc.uri) : doc.uri.path,
          diags: this.diagnostics(doc.uri)
        };
      }
      track(doc) {
        const w = { version: doc.version, shadow: toText(doc.getText()), history: [] };
        this.watched.set(doc.uri.toString(), w);
        return w;
      }
      // A phone sends a ChangeSet made against `version`. If the computer changed the file since,
      // rebase the phone's changes over those newer changes instead of rejecting them.
      async edit({ uri, version, changes, clientId }) {
        const vs = this.vscode;
        const w = typeof uri === "string" && this.watched.get(uri);
        const doc = w && this.findDoc(uri);
        if (!doc) return { ok: false, error: "gone" };
        const conflict = () => ({ ok: false, error: "conflict" });
        if (w.version !== doc.version || !Number.isInteger(version) || version > w.version) return conflict();
        let cs;
        try {
          cs = ChangeSet.fromJSON(changes);
          if (version < w.version) {
            const newer = w.history.filter((h) => h.version > version);
            if (!newer.length || newer[0].version !== version + 1) return conflict();
            for (const h of newer) cs = cs.map(h.changes);
          }
          if (cs.length !== w.shadow.length) return conflict();
        } catch {
          return conflict();
        }
        if (cs.empty) return { ok: true };
        const eol = doc.eol === vs.EndOfLine.CRLF ? "\r\n" : "\n";
        const we = new vs.WorkspaceEdit();
        cs.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
          const a = w.shadow.lineAt(fromA);
          const b = w.shadow.lineAt(toA);
          const range = new vs.Range(a.number - 1, fromA - a.from, b.number - 1, toA - b.from);
          we.replace(doc.uri, range, inserted.toString().replace(/\n/g, eol));
        });
        this.pendingOrigin.set(uri, String(clientId || "phone"));
        let ok;
        try {
          ok = await vs.workspace.applyEdit(we);
        } finally {
          this.pendingOrigin.delete(uri);
        }
        return ok ? { ok: true } : conflict();
      }
      async save({ uri }) {
        const doc = typeof uri === "string" && this.watched.has(uri) && this.findDoc(uri);
        if (!doc) return { ok: false, error: "gone" };
        let ok;
        if (typeof this.vscode.workspace.save === "function") ok = !!await this.vscode.workspace.save(doc.uri);
        else ok = await doc.save();
        return { ok, version: doc.version, dirty: doc.isDirty };
      }
      // Problems reported by language extensions (ESLint, Pylance, TypeScript, ...).
      diagnostics(uri) {
        const vs = this.vscode;
        if (!vs.languages || !vs.languages.getDiagnostics) return [];
        const sev = ["error", "warning", "info", "hint"];
        return vs.languages.getDiagnostics(uri).slice(0, 500).map((d) => ({
          from: { l: d.range.start.line, c: d.range.start.character },
          to: { l: d.range.end.line, c: d.range.end.character },
          severity: sev[d.severity] || "info",
          message: String(d.message).slice(0, 2e3),
          source: d.source ? String(d.source) + (d.code !== void 0 ? `(${typeof d.code === "object" ? d.code.value : d.code})` : "") : ""
        }));
      }
      // Commands that extensions add to the Command Palette, plus a few useful built-ins.
      commandList() {
        const vs = this.vscode;
        const allow = this.opts.allowCommands !== false;
        if (!allow) return { allowed: false, commands: [] };
        const out = /* @__PURE__ */ new Map();
        const add = (id, title, category, ext) => {
          if (!id || !title || out.has(id)) return;
          out.set(id, { id, title: category ? `${category}: ${title}` : title, ext });
        };
        for (const [id, title] of BUILTIN_COMMANDS) add(id, title, "", "Antigravity");
        for (const ext of vs.extensions ? vs.extensions.all : []) {
          const pj = ext.packageJSON || {};
          const contributes = pj.contributes || {};
          const hidden = new Set(
            (contributes.menus && contributes.menus.commandPalette || []).filter((m) => m && m.when === "false").map((m) => m.command)
          );
          const cmds = Array.isArray(contributes.commands) ? contributes.commands : contributes.commands ? [contributes.commands] : [];
          for (const c of cmds) {
            if (!c || hidden.has(c.command)) continue;
            const title = typeof c.title === "string" ? c.title : c.title && c.title.value;
            const cat = typeof c.category === "string" ? c.category : c.category && c.category.value;
            if (!title || title.startsWith("%")) continue;
            add(c.command, title, cat && !cat.startsWith("%") ? cat : "", pj.displayName || pj.name || ext.id);
          }
        }
        return { allowed: true, commands: [...out.values()].sort((a, b) => a.title.localeCompare(b.title)) };
      }
      // Run a command on the computer with the phone's current file as the active editor.
      async run({ id, uri }) {
        const vs = this.vscode;
        if (this.opts.allowCommands === false) return { ok: false, error: "\u0E1B\u0E34\u0E14\u0E01\u0E32\u0E23\u0E23\u0E31\u0E19\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E08\u0E32\u0E01\u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D\u0E44\u0E27\u0E49 (mobileSync.allowCommands)" };
        if (typeof id !== "string" || !id || id.length > 200) return { ok: false, error: "bad command" };
        if (typeof uri === "string" && this.watched.has(uri)) {
          const doc = this.findDoc(uri);
          if (doc) await vs.window.showTextDocument(doc, { preview: false, preserveFocus: false });
        }
        const exec = Promise.resolve(vs.commands.executeCommand(id)).then(
          () => ({ ok: true, done: true }),
          (err) => ({ ok: false, error: String(err && err.message || err).slice(0, 500) })
        );
        const later = new Promise((r) => setTimeout(() => r({ ok: true, done: false }), 4e3));
        return Promise.race([exec, later]);
      }
      json(res, obj) {
        res.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(obj));
      }
      fail(res, code, message) {
        if (res.headersSent) return res.end();
        res.writeHead(code, { ...SECURITY_HEADERS, "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: message }));
      }
    };
    function offsetIn(text, p) {
      const line = text.line(p.line + 1);
      if (p.character > line.length) throw new RangeError("bad position");
      return line.from + p.character;
    }
    function sameLength(shadow, doc) {
      const crlf = doc.eol === 2;
      return shadow.length + (crlf ? shadow.lines - 1 : 0) === doc.getText().length;
    }
    function readJson(req) {
      return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on("data", (c) => {
          size += c.length;
          if (size > MAX_BODY) {
            reject(new Error("request too large"));
            req.destroy();
          } else chunks.push(c);
        });
        req.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
          } catch {
            reject(new Error("bad json"));
          }
        });
        req.on("error", reject);
      });
    }
    module2.exports = { SyncServer: SyncServer2 };
  }
});

// node_modules/qrcode-generator/qrcode.js
var require_qrcode = __commonJS({
  "node_modules/qrcode-generator/qrcode.js"(exports2, module2) {
    var qrcode = function() {
      var qrcode2 = function(typeNumber, errorCorrectionLevel) {
        var PAD0 = 236;
        var PAD1 = 17;
        var _typeNumber = typeNumber;
        var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
        var _modules = null;
        var _moduleCount = 0;
        var _dataCache = null;
        var _dataList = [];
        var _this = {};
        var makeImpl = function(test, maskPattern) {
          _moduleCount = _typeNumber * 4 + 17;
          _modules = function(moduleCount) {
            var modules = new Array(moduleCount);
            for (var row = 0; row < moduleCount; row += 1) {
              modules[row] = new Array(moduleCount);
              for (var col = 0; col < moduleCount; col += 1) {
                modules[row][col] = null;
              }
            }
            return modules;
          }(_moduleCount);
          setupPositionProbePattern(0, 0);
          setupPositionProbePattern(_moduleCount - 7, 0);
          setupPositionProbePattern(0, _moduleCount - 7);
          setupPositionAdjustPattern();
          setupTimingPattern();
          setupTypeInfo(test, maskPattern);
          if (_typeNumber >= 7) {
            setupTypeNumber(test);
          }
          if (_dataCache == null) {
            _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
          }
          mapData(_dataCache, maskPattern);
        };
        var setupPositionProbePattern = function(row, col) {
          for (var r = -1; r <= 7; r += 1) {
            if (row + r <= -1 || _moduleCount <= row + r) continue;
            for (var c = -1; c <= 7; c += 1) {
              if (col + c <= -1 || _moduleCount <= col + c) continue;
              if (0 <= r && r <= 6 && (c == 0 || c == 6) || 0 <= c && c <= 6 && (r == 0 || r == 6) || 2 <= r && r <= 4 && 2 <= c && c <= 4) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        };
        var getBestMaskPattern = function() {
          var minLostPoint = 0;
          var pattern = 0;
          for (var i = 0; i < 8; i += 1) {
            makeImpl(true, i);
            var lostPoint = QRUtil.getLostPoint(_this);
            if (i == 0 || minLostPoint > lostPoint) {
              minLostPoint = lostPoint;
              pattern = i;
            }
          }
          return pattern;
        };
        var setupTimingPattern = function() {
          for (var r = 8; r < _moduleCount - 8; r += 1) {
            if (_modules[r][6] != null) {
              continue;
            }
            _modules[r][6] = r % 2 == 0;
          }
          for (var c = 8; c < _moduleCount - 8; c += 1) {
            if (_modules[6][c] != null) {
              continue;
            }
            _modules[6][c] = c % 2 == 0;
          }
        };
        var setupPositionAdjustPattern = function() {
          var pos = QRUtil.getPatternPosition(_typeNumber);
          for (var i = 0; i < pos.length; i += 1) {
            for (var j = 0; j < pos.length; j += 1) {
              var row = pos[i];
              var col = pos[j];
              if (_modules[row][col] != null) {
                continue;
              }
              for (var r = -2; r <= 2; r += 1) {
                for (var c = -2; c <= 2; c += 1) {
                  if (r == -2 || r == 2 || c == -2 || c == 2 || r == 0 && c == 0) {
                    _modules[row + r][col + c] = true;
                  } else {
                    _modules[row + r][col + c] = false;
                  }
                }
              }
            }
          }
        };
        var setupTypeNumber = function(test) {
          var bits = QRUtil.getBCHTypeNumber(_typeNumber);
          for (var i = 0; i < 18; i += 1) {
            var mod = !test && (bits >> i & 1) == 1;
            _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
          }
          for (var i = 0; i < 18; i += 1) {
            var mod = !test && (bits >> i & 1) == 1;
            _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
          }
        };
        var setupTypeInfo = function(test, maskPattern) {
          var data = _errorCorrectionLevel << 3 | maskPattern;
          var bits = QRUtil.getBCHTypeInfo(data);
          for (var i = 0; i < 15; i += 1) {
            var mod = !test && (bits >> i & 1) == 1;
            if (i < 6) {
              _modules[i][8] = mod;
            } else if (i < 8) {
              _modules[i + 1][8] = mod;
            } else {
              _modules[_moduleCount - 15 + i][8] = mod;
            }
          }
          for (var i = 0; i < 15; i += 1) {
            var mod = !test && (bits >> i & 1) == 1;
            if (i < 8) {
              _modules[8][_moduleCount - i - 1] = mod;
            } else if (i < 9) {
              _modules[8][15 - i - 1 + 1] = mod;
            } else {
              _modules[8][15 - i - 1] = mod;
            }
          }
          _modules[_moduleCount - 8][8] = !test;
        };
        var mapData = function(data, maskPattern) {
          var inc = -1;
          var row = _moduleCount - 1;
          var bitIndex = 7;
          var byteIndex = 0;
          var maskFunc = QRUtil.getMaskFunction(maskPattern);
          for (var col = _moduleCount - 1; col > 0; col -= 2) {
            if (col == 6) col -= 1;
            while (true) {
              for (var c = 0; c < 2; c += 1) {
                if (_modules[row][col - c] == null) {
                  var dark = false;
                  if (byteIndex < data.length) {
                    dark = (data[byteIndex] >>> bitIndex & 1) == 1;
                  }
                  var mask = maskFunc(row, col - c);
                  if (mask) {
                    dark = !dark;
                  }
                  _modules[row][col - c] = dark;
                  bitIndex -= 1;
                  if (bitIndex == -1) {
                    byteIndex += 1;
                    bitIndex = 7;
                  }
                }
              }
              row += inc;
              if (row < 0 || _moduleCount <= row) {
                row -= inc;
                inc = -inc;
                break;
              }
            }
          }
        };
        var createBytes = function(buffer, rsBlocks) {
          var offset = 0;
          var maxDcCount = 0;
          var maxEcCount = 0;
          var dcdata = new Array(rsBlocks.length);
          var ecdata = new Array(rsBlocks.length);
          for (var r = 0; r < rsBlocks.length; r += 1) {
            var dcCount = rsBlocks[r].dataCount;
            var ecCount = rsBlocks[r].totalCount - dcCount;
            maxDcCount = Math.max(maxDcCount, dcCount);
            maxEcCount = Math.max(maxEcCount, ecCount);
            dcdata[r] = new Array(dcCount);
            for (var i = 0; i < dcdata[r].length; i += 1) {
              dcdata[r][i] = 255 & buffer.getBuffer()[i + offset];
            }
            offset += dcCount;
            var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
            var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);
            var modPoly = rawPoly.mod(rsPoly);
            ecdata[r] = new Array(rsPoly.getLength() - 1);
            for (var i = 0; i < ecdata[r].length; i += 1) {
              var modIndex = i + modPoly.getLength() - ecdata[r].length;
              ecdata[r][i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
            }
          }
          var totalCodeCount = 0;
          for (var i = 0; i < rsBlocks.length; i += 1) {
            totalCodeCount += rsBlocks[i].totalCount;
          }
          var data = new Array(totalCodeCount);
          var index = 0;
          for (var i = 0; i < maxDcCount; i += 1) {
            for (var r = 0; r < rsBlocks.length; r += 1) {
              if (i < dcdata[r].length) {
                data[index] = dcdata[r][i];
                index += 1;
              }
            }
          }
          for (var i = 0; i < maxEcCount; i += 1) {
            for (var r = 0; r < rsBlocks.length; r += 1) {
              if (i < ecdata[r].length) {
                data[index] = ecdata[r][i];
                index += 1;
              }
            }
          }
          return data;
        };
        var createData = function(typeNumber2, errorCorrectionLevel2, dataList) {
          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber2, errorCorrectionLevel2);
          var buffer = qrBitBuffer();
          for (var i = 0; i < dataList.length; i += 1) {
            var data = dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber2));
            data.write(buffer);
          }
          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i += 1) {
            totalDataCount += rsBlocks[i].dataCount;
          }
          if (buffer.getLengthInBits() > totalDataCount * 8) {
            throw "code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")";
          }
          if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
            buffer.put(0, 4);
          }
          while (buffer.getLengthInBits() % 8 != 0) {
            buffer.putBit(false);
          }
          while (true) {
            if (buffer.getLengthInBits() >= totalDataCount * 8) {
              break;
            }
            buffer.put(PAD0, 8);
            if (buffer.getLengthInBits() >= totalDataCount * 8) {
              break;
            }
            buffer.put(PAD1, 8);
          }
          return createBytes(buffer, rsBlocks);
        };
        _this.addData = function(data, mode) {
          mode = mode || "Byte";
          var newData = null;
          switch (mode) {
            case "Numeric":
              newData = qrNumber(data);
              break;
            case "Alphanumeric":
              newData = qrAlphaNum(data);
              break;
            case "Byte":
              newData = qr8BitByte(data);
              break;
            case "Kanji":
              newData = qrKanji(data);
              break;
            default:
              throw "mode:" + mode;
          }
          _dataList.push(newData);
          _dataCache = null;
        };
        _this.isDark = function(row, col) {
          if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
            throw row + "," + col;
          }
          return _modules[row][col];
        };
        _this.getModuleCount = function() {
          return _moduleCount;
        };
        _this.make = function() {
          if (_typeNumber < 1) {
            var typeNumber2 = 1;
            for (; typeNumber2 < 40; typeNumber2++) {
              var rsBlocks = QRRSBlock.getRSBlocks(typeNumber2, _errorCorrectionLevel);
              var buffer = qrBitBuffer();
              for (var i = 0; i < _dataList.length; i++) {
                var data = _dataList[i];
                buffer.put(data.getMode(), 4);
                buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber2));
                data.write(buffer);
              }
              var totalDataCount = 0;
              for (var i = 0; i < rsBlocks.length; i++) {
                totalDataCount += rsBlocks[i].dataCount;
              }
              if (buffer.getLengthInBits() <= totalDataCount * 8) {
                break;
              }
            }
            _typeNumber = typeNumber2;
          }
          makeImpl(false, getBestMaskPattern());
        };
        _this.createTableTag = function(cellSize, margin) {
          cellSize = cellSize || 2;
          margin = typeof margin == "undefined" ? cellSize * 4 : margin;
          var qrHtml = "";
          qrHtml += '<table style="';
          qrHtml += " border-width: 0px; border-style: none;";
          qrHtml += " border-collapse: collapse;";
          qrHtml += " padding: 0px; margin: " + margin + "px;";
          qrHtml += '">';
          qrHtml += "<tbody>";
          for (var r = 0; r < _this.getModuleCount(); r += 1) {
            qrHtml += "<tr>";
            for (var c = 0; c < _this.getModuleCount(); c += 1) {
              qrHtml += '<td style="';
              qrHtml += " border-width: 0px; border-style: none;";
              qrHtml += " border-collapse: collapse;";
              qrHtml += " padding: 0px; margin: 0px;";
              qrHtml += " width: " + cellSize + "px;";
              qrHtml += " height: " + cellSize + "px;";
              qrHtml += " background-color: ";
              qrHtml += _this.isDark(r, c) ? "#000000" : "#ffffff";
              qrHtml += ";";
              qrHtml += '"/>';
            }
            qrHtml += "</tr>";
          }
          qrHtml += "</tbody>";
          qrHtml += "</table>";
          return qrHtml;
        };
        _this.createSvgTag = function(cellSize, margin, alt, title) {
          var opts = {};
          if (typeof arguments[0] == "object") {
            opts = arguments[0];
            cellSize = opts.cellSize;
            margin = opts.margin;
            alt = opts.alt;
            title = opts.title;
          }
          cellSize = cellSize || 2;
          margin = typeof margin == "undefined" ? cellSize * 4 : margin;
          alt = typeof alt === "string" ? { text: alt } : alt || {};
          alt.text = alt.text || null;
          alt.id = alt.text ? alt.id || "qrcode-description" : null;
          title = typeof title === "string" ? { text: title } : title || {};
          title.text = title.text || null;
          title.id = title.text ? title.id || "qrcode-title" : null;
          var size = _this.getModuleCount() * cellSize + margin * 2;
          var c, mc, r, mr, qrSvg2 = "", rect;
          rect = "l" + cellSize + ",0 0," + cellSize + " -" + cellSize + ",0 0,-" + cellSize + "z ";
          qrSvg2 += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
          qrSvg2 += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : "";
          qrSvg2 += ' viewBox="0 0 ' + size + " " + size + '" ';
          qrSvg2 += ' preserveAspectRatio="xMinYMin meet"';
          qrSvg2 += title.text || alt.text ? ' role="img" aria-labelledby="' + escapeXml([title.id, alt.id].join(" ").trim()) + '"' : "";
          qrSvg2 += ">";
          qrSvg2 += title.text ? '<title id="' + escapeXml(title.id) + '">' + escapeXml(title.text) + "</title>" : "";
          qrSvg2 += alt.text ? '<description id="' + escapeXml(alt.id) + '">' + escapeXml(alt.text) + "</description>" : "";
          qrSvg2 += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
          qrSvg2 += '<path d="';
          for (r = 0; r < _this.getModuleCount(); r += 1) {
            mr = r * cellSize + margin;
            for (c = 0; c < _this.getModuleCount(); c += 1) {
              if (_this.isDark(r, c)) {
                mc = c * cellSize + margin;
                qrSvg2 += "M" + mc + "," + mr + rect;
              }
            }
          }
          qrSvg2 += '" stroke="transparent" fill="black"/>';
          qrSvg2 += "</svg>";
          return qrSvg2;
        };
        _this.createDataURL = function(cellSize, margin) {
          cellSize = cellSize || 2;
          margin = typeof margin == "undefined" ? cellSize * 4 : margin;
          var size = _this.getModuleCount() * cellSize + margin * 2;
          var min = margin;
          var max = size - margin;
          return createDataURL(size, size, function(x, y) {
            if (min <= x && x < max && min <= y && y < max) {
              var c = Math.floor((x - min) / cellSize);
              var r = Math.floor((y - min) / cellSize);
              return _this.isDark(r, c) ? 0 : 1;
            } else {
              return 1;
            }
          });
        };
        _this.createImgTag = function(cellSize, margin, alt) {
          cellSize = cellSize || 2;
          margin = typeof margin == "undefined" ? cellSize * 4 : margin;
          var size = _this.getModuleCount() * cellSize + margin * 2;
          var img = "";
          img += "<img";
          img += ' src="';
          img += _this.createDataURL(cellSize, margin);
          img += '"';
          img += ' width="';
          img += size;
          img += '"';
          img += ' height="';
          img += size;
          img += '"';
          if (alt) {
            img += ' alt="';
            img += escapeXml(alt);
            img += '"';
          }
          img += "/>";
          return img;
        };
        var escapeXml = function(s) {
          var escaped = "";
          for (var i = 0; i < s.length; i += 1) {
            var c = s.charAt(i);
            switch (c) {
              case "<":
                escaped += "&lt;";
                break;
              case ">":
                escaped += "&gt;";
                break;
              case "&":
                escaped += "&amp;";
                break;
              case '"':
                escaped += "&quot;";
                break;
              default:
                escaped += c;
                break;
            }
          }
          return escaped;
        };
        var _createHalfASCII = function(margin) {
          var cellSize = 1;
          margin = typeof margin == "undefined" ? cellSize * 2 : margin;
          var size = _this.getModuleCount() * cellSize + margin * 2;
          var min = margin;
          var max = size - margin;
          var y, x, r1, r2, p;
          var blocks = {
            "\u2588\u2588": "\u2588",
            "\u2588 ": "\u2580",
            " \u2588": "\u2584",
            "  ": " "
          };
          var blocksLastLineNoMargin = {
            "\u2588\u2588": "\u2580",
            "\u2588 ": "\u2580",
            " \u2588": " ",
            "  ": " "
          };
          var ascii = "";
          for (y = 0; y < size; y += 2) {
            r1 = Math.floor((y - min) / cellSize);
            r2 = Math.floor((y + 1 - min) / cellSize);
            for (x = 0; x < size; x += 1) {
              p = "\u2588";
              if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
                p = " ";
              }
              if (min <= x && x < max && min <= y + 1 && y + 1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
                p += " ";
              } else {
                p += "\u2588";
              }
              ascii += margin < 1 && y + 1 >= max ? blocksLastLineNoMargin[p] : blocks[p];
            }
            ascii += "\n";
          }
          if (size % 2 && margin > 0) {
            return ascii.substring(0, ascii.length - size - 1) + Array(size + 1).join("\u2580");
          }
          return ascii.substring(0, ascii.length - 1);
        };
        _this.createASCII = function(cellSize, margin) {
          cellSize = cellSize || 1;
          if (cellSize < 2) {
            return _createHalfASCII(margin);
          }
          cellSize -= 1;
          margin = typeof margin == "undefined" ? cellSize * 2 : margin;
          var size = _this.getModuleCount() * cellSize + margin * 2;
          var min = margin;
          var max = size - margin;
          var y, x, r, p;
          var white = Array(cellSize + 1).join("\u2588\u2588");
          var black = Array(cellSize + 1).join("  ");
          var ascii = "";
          var line = "";
          for (y = 0; y < size; y += 1) {
            r = Math.floor((y - min) / cellSize);
            line = "";
            for (x = 0; x < size; x += 1) {
              p = 1;
              if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
                p = 0;
              }
              line += p ? white : black;
            }
            for (r = 0; r < cellSize; r += 1) {
              ascii += line + "\n";
            }
          }
          return ascii.substring(0, ascii.length - 1);
        };
        _this.renderTo2dContext = function(context, cellSize) {
          cellSize = cellSize || 2;
          var length = _this.getModuleCount();
          for (var row = 0; row < length; row++) {
            for (var col = 0; col < length; col++) {
              context.fillStyle = _this.isDark(row, col) ? "black" : "white";
              context.fillRect(row * cellSize, col * cellSize, cellSize, cellSize);
            }
          }
        };
        return _this;
      };
      qrcode2.stringToBytesFuncs = {
        "default": function(s) {
          var bytes = [];
          for (var i = 0; i < s.length; i += 1) {
            var c = s.charCodeAt(i);
            bytes.push(c & 255);
          }
          return bytes;
        }
      };
      qrcode2.stringToBytes = qrcode2.stringToBytesFuncs["default"];
      qrcode2.createStringToBytes = function(unicodeData, numChars) {
        var unicodeMap = function() {
          var bin = base64DecodeInputStream(unicodeData);
          var read = function() {
            var b = bin.read();
            if (b == -1) throw "eof";
            return b;
          };
          var count = 0;
          var unicodeMap2 = {};
          while (true) {
            var b0 = bin.read();
            if (b0 == -1) break;
            var b1 = read();
            var b2 = read();
            var b3 = read();
            var k = String.fromCharCode(b0 << 8 | b1);
            var v = b2 << 8 | b3;
            unicodeMap2[k] = v;
            count += 1;
          }
          if (count != numChars) {
            throw count + " != " + numChars;
          }
          return unicodeMap2;
        }();
        var unknownChar = "?".charCodeAt(0);
        return function(s) {
          var bytes = [];
          for (var i = 0; i < s.length; i += 1) {
            var c = s.charCodeAt(i);
            if (c < 128) {
              bytes.push(c);
            } else {
              var b = unicodeMap[s.charAt(i)];
              if (typeof b == "number") {
                if ((b & 255) == b) {
                  bytes.push(b);
                } else {
                  bytes.push(b >>> 8);
                  bytes.push(b & 255);
                }
              } else {
                bytes.push(unknownChar);
              }
            }
          }
          return bytes;
        };
      };
      var QRMode = {
        MODE_NUMBER: 1 << 0,
        MODE_ALPHA_NUM: 1 << 1,
        MODE_8BIT_BYTE: 1 << 2,
        MODE_KANJI: 1 << 3
      };
      var QRErrorCorrectionLevel = {
        L: 1,
        M: 0,
        Q: 3,
        H: 2
      };
      var QRMaskPattern = {
        PATTERN000: 0,
        PATTERN001: 1,
        PATTERN010: 2,
        PATTERN011: 3,
        PATTERN100: 4,
        PATTERN101: 5,
        PATTERN110: 6,
        PATTERN111: 7
      };
      var QRUtil = function() {
        var PATTERN_POSITION_TABLE = [
          [],
          [6, 18],
          [6, 22],
          [6, 26],
          [6, 30],
          [6, 34],
          [6, 22, 38],
          [6, 24, 42],
          [6, 26, 46],
          [6, 28, 50],
          [6, 30, 54],
          [6, 32, 58],
          [6, 34, 62],
          [6, 26, 46, 66],
          [6, 26, 48, 70],
          [6, 26, 50, 74],
          [6, 30, 54, 78],
          [6, 30, 56, 82],
          [6, 30, 58, 86],
          [6, 34, 62, 90],
          [6, 28, 50, 72, 94],
          [6, 26, 50, 74, 98],
          [6, 30, 54, 78, 102],
          [6, 28, 54, 80, 106],
          [6, 32, 58, 84, 110],
          [6, 30, 58, 86, 114],
          [6, 34, 62, 90, 118],
          [6, 26, 50, 74, 98, 122],
          [6, 30, 54, 78, 102, 126],
          [6, 26, 52, 78, 104, 130],
          [6, 30, 56, 82, 108, 134],
          [6, 34, 60, 86, 112, 138],
          [6, 30, 58, 86, 114, 142],
          [6, 34, 62, 90, 118, 146],
          [6, 30, 54, 78, 102, 126, 150],
          [6, 24, 50, 76, 102, 128, 154],
          [6, 28, 54, 80, 106, 132, 158],
          [6, 32, 58, 84, 110, 136, 162],
          [6, 26, 54, 82, 110, 138, 166],
          [6, 30, 58, 86, 114, 142, 170]
        ];
        var G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
        var G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
        var G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
        var _this = {};
        var getBCHDigit = function(data) {
          var digit = 0;
          while (data != 0) {
            digit += 1;
            data >>>= 1;
          }
          return digit;
        };
        _this.getBCHTypeInfo = function(data) {
          var d = data << 10;
          while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
            d ^= G15 << getBCHDigit(d) - getBCHDigit(G15);
          }
          return (data << 10 | d) ^ G15_MASK;
        };
        _this.getBCHTypeNumber = function(data) {
          var d = data << 12;
          while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
            d ^= G18 << getBCHDigit(d) - getBCHDigit(G18);
          }
          return data << 12 | d;
        };
        _this.getPatternPosition = function(typeNumber) {
          return PATTERN_POSITION_TABLE[typeNumber - 1];
        };
        _this.getMaskFunction = function(maskPattern) {
          switch (maskPattern) {
            case QRMaskPattern.PATTERN000:
              return function(i, j) {
                return (i + j) % 2 == 0;
              };
            case QRMaskPattern.PATTERN001:
              return function(i, j) {
                return i % 2 == 0;
              };
            case QRMaskPattern.PATTERN010:
              return function(i, j) {
                return j % 3 == 0;
              };
            case QRMaskPattern.PATTERN011:
              return function(i, j) {
                return (i + j) % 3 == 0;
              };
            case QRMaskPattern.PATTERN100:
              return function(i, j) {
                return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
              };
            case QRMaskPattern.PATTERN101:
              return function(i, j) {
                return i * j % 2 + i * j % 3 == 0;
              };
            case QRMaskPattern.PATTERN110:
              return function(i, j) {
                return (i * j % 2 + i * j % 3) % 2 == 0;
              };
            case QRMaskPattern.PATTERN111:
              return function(i, j) {
                return (i * j % 3 + (i + j) % 2) % 2 == 0;
              };
            default:
              throw "bad maskPattern:" + maskPattern;
          }
        };
        _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
          var a = qrPolynomial([1], 0);
          for (var i = 0; i < errorCorrectLength; i += 1) {
            a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0));
          }
          return a;
        };
        _this.getLengthInBits = function(mode, type) {
          if (1 <= type && type < 10) {
            switch (mode) {
              case QRMode.MODE_NUMBER:
                return 10;
              case QRMode.MODE_ALPHA_NUM:
                return 9;
              case QRMode.MODE_8BIT_BYTE:
                return 8;
              case QRMode.MODE_KANJI:
                return 8;
              default:
                throw "mode:" + mode;
            }
          } else if (type < 27) {
            switch (mode) {
              case QRMode.MODE_NUMBER:
                return 12;
              case QRMode.MODE_ALPHA_NUM:
                return 11;
              case QRMode.MODE_8BIT_BYTE:
                return 16;
              case QRMode.MODE_KANJI:
                return 10;
              default:
                throw "mode:" + mode;
            }
          } else if (type < 41) {
            switch (mode) {
              case QRMode.MODE_NUMBER:
                return 14;
              case QRMode.MODE_ALPHA_NUM:
                return 13;
              case QRMode.MODE_8BIT_BYTE:
                return 16;
              case QRMode.MODE_KANJI:
                return 12;
              default:
                throw "mode:" + mode;
            }
          } else {
            throw "type:" + type;
          }
        };
        _this.getLostPoint = function(qrcode3) {
          var moduleCount = qrcode3.getModuleCount();
          var lostPoint = 0;
          for (var row = 0; row < moduleCount; row += 1) {
            for (var col = 0; col < moduleCount; col += 1) {
              var sameCount = 0;
              var dark = qrcode3.isDark(row, col);
              for (var r = -1; r <= 1; r += 1) {
                if (row + r < 0 || moduleCount <= row + r) {
                  continue;
                }
                for (var c = -1; c <= 1; c += 1) {
                  if (col + c < 0 || moduleCount <= col + c) {
                    continue;
                  }
                  if (r == 0 && c == 0) {
                    continue;
                  }
                  if (dark == qrcode3.isDark(row + r, col + c)) {
                    sameCount += 1;
                  }
                }
              }
              if (sameCount > 5) {
                lostPoint += 3 + sameCount - 5;
              }
            }
          }
          ;
          for (var row = 0; row < moduleCount - 1; row += 1) {
            for (var col = 0; col < moduleCount - 1; col += 1) {
              var count = 0;
              if (qrcode3.isDark(row, col)) count += 1;
              if (qrcode3.isDark(row + 1, col)) count += 1;
              if (qrcode3.isDark(row, col + 1)) count += 1;
              if (qrcode3.isDark(row + 1, col + 1)) count += 1;
              if (count == 0 || count == 4) {
                lostPoint += 3;
              }
            }
          }
          for (var row = 0; row < moduleCount; row += 1) {
            for (var col = 0; col < moduleCount - 6; col += 1) {
              if (qrcode3.isDark(row, col) && !qrcode3.isDark(row, col + 1) && qrcode3.isDark(row, col + 2) && qrcode3.isDark(row, col + 3) && qrcode3.isDark(row, col + 4) && !qrcode3.isDark(row, col + 5) && qrcode3.isDark(row, col + 6)) {
                lostPoint += 40;
              }
            }
          }
          for (var col = 0; col < moduleCount; col += 1) {
            for (var row = 0; row < moduleCount - 6; row += 1) {
              if (qrcode3.isDark(row, col) && !qrcode3.isDark(row + 1, col) && qrcode3.isDark(row + 2, col) && qrcode3.isDark(row + 3, col) && qrcode3.isDark(row + 4, col) && !qrcode3.isDark(row + 5, col) && qrcode3.isDark(row + 6, col)) {
                lostPoint += 40;
              }
            }
          }
          var darkCount = 0;
          for (var col = 0; col < moduleCount; col += 1) {
            for (var row = 0; row < moduleCount; row += 1) {
              if (qrcode3.isDark(row, col)) {
                darkCount += 1;
              }
            }
          }
          var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
          lostPoint += ratio * 10;
          return lostPoint;
        };
        return _this;
      }();
      var QRMath = function() {
        var EXP_TABLE = new Array(256);
        var LOG_TABLE = new Array(256);
        for (var i = 0; i < 8; i += 1) {
          EXP_TABLE[i] = 1 << i;
        }
        for (var i = 8; i < 256; i += 1) {
          EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
        }
        for (var i = 0; i < 255; i += 1) {
          LOG_TABLE[EXP_TABLE[i]] = i;
        }
        var _this = {};
        _this.glog = function(n) {
          if (n < 1) {
            throw "glog(" + n + ")";
          }
          return LOG_TABLE[n];
        };
        _this.gexp = function(n) {
          while (n < 0) {
            n += 255;
          }
          while (n >= 256) {
            n -= 255;
          }
          return EXP_TABLE[n];
        };
        return _this;
      }();
      function qrPolynomial(num, shift) {
        if (typeof num.length == "undefined") {
          throw num.length + "/" + shift;
        }
        var _num = function() {
          var offset = 0;
          while (offset < num.length && num[offset] == 0) {
            offset += 1;
          }
          var _num2 = new Array(num.length - offset + shift);
          for (var i = 0; i < num.length - offset; i += 1) {
            _num2[i] = num[i + offset];
          }
          return _num2;
        }();
        var _this = {};
        _this.getAt = function(index) {
          return _num[index];
        };
        _this.getLength = function() {
          return _num.length;
        };
        _this.multiply = function(e) {
          var num2 = new Array(_this.getLength() + e.getLength() - 1);
          for (var i = 0; i < _this.getLength(); i += 1) {
            for (var j = 0; j < e.getLength(); j += 1) {
              num2[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i)) + QRMath.glog(e.getAt(j)));
            }
          }
          return qrPolynomial(num2, 0);
        };
        _this.mod = function(e) {
          if (_this.getLength() - e.getLength() < 0) {
            return _this;
          }
          var ratio = QRMath.glog(_this.getAt(0)) - QRMath.glog(e.getAt(0));
          var num2 = new Array(_this.getLength());
          for (var i = 0; i < _this.getLength(); i += 1) {
            num2[i] = _this.getAt(i);
          }
          for (var i = 0; i < e.getLength(); i += 1) {
            num2[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
          }
          return qrPolynomial(num2, 0).mod(e);
        };
        return _this;
      }
      ;
      var QRRSBlock = function() {
        var RS_BLOCK_TABLE = [
          // L
          // M
          // Q
          // H
          // 1
          [1, 26, 19],
          [1, 26, 16],
          [1, 26, 13],
          [1, 26, 9],
          // 2
          [1, 44, 34],
          [1, 44, 28],
          [1, 44, 22],
          [1, 44, 16],
          // 3
          [1, 70, 55],
          [1, 70, 44],
          [2, 35, 17],
          [2, 35, 13],
          // 4
          [1, 100, 80],
          [2, 50, 32],
          [2, 50, 24],
          [4, 25, 9],
          // 5
          [1, 134, 108],
          [2, 67, 43],
          [2, 33, 15, 2, 34, 16],
          [2, 33, 11, 2, 34, 12],
          // 6
          [2, 86, 68],
          [4, 43, 27],
          [4, 43, 19],
          [4, 43, 15],
          // 7
          [2, 98, 78],
          [4, 49, 31],
          [2, 32, 14, 4, 33, 15],
          [4, 39, 13, 1, 40, 14],
          // 8
          [2, 121, 97],
          [2, 60, 38, 2, 61, 39],
          [4, 40, 18, 2, 41, 19],
          [4, 40, 14, 2, 41, 15],
          // 9
          [2, 146, 116],
          [3, 58, 36, 2, 59, 37],
          [4, 36, 16, 4, 37, 17],
          [4, 36, 12, 4, 37, 13],
          // 10
          [2, 86, 68, 2, 87, 69],
          [4, 69, 43, 1, 70, 44],
          [6, 43, 19, 2, 44, 20],
          [6, 43, 15, 2, 44, 16],
          // 11
          [4, 101, 81],
          [1, 80, 50, 4, 81, 51],
          [4, 50, 22, 4, 51, 23],
          [3, 36, 12, 8, 37, 13],
          // 12
          [2, 116, 92, 2, 117, 93],
          [6, 58, 36, 2, 59, 37],
          [4, 46, 20, 6, 47, 21],
          [7, 42, 14, 4, 43, 15],
          // 13
          [4, 133, 107],
          [8, 59, 37, 1, 60, 38],
          [8, 44, 20, 4, 45, 21],
          [12, 33, 11, 4, 34, 12],
          // 14
          [3, 145, 115, 1, 146, 116],
          [4, 64, 40, 5, 65, 41],
          [11, 36, 16, 5, 37, 17],
          [11, 36, 12, 5, 37, 13],
          // 15
          [5, 109, 87, 1, 110, 88],
          [5, 65, 41, 5, 66, 42],
          [5, 54, 24, 7, 55, 25],
          [11, 36, 12, 7, 37, 13],
          // 16
          [5, 122, 98, 1, 123, 99],
          [7, 73, 45, 3, 74, 46],
          [15, 43, 19, 2, 44, 20],
          [3, 45, 15, 13, 46, 16],
          // 17
          [1, 135, 107, 5, 136, 108],
          [10, 74, 46, 1, 75, 47],
          [1, 50, 22, 15, 51, 23],
          [2, 42, 14, 17, 43, 15],
          // 18
          [5, 150, 120, 1, 151, 121],
          [9, 69, 43, 4, 70, 44],
          [17, 50, 22, 1, 51, 23],
          [2, 42, 14, 19, 43, 15],
          // 19
          [3, 141, 113, 4, 142, 114],
          [3, 70, 44, 11, 71, 45],
          [17, 47, 21, 4, 48, 22],
          [9, 39, 13, 16, 40, 14],
          // 20
          [3, 135, 107, 5, 136, 108],
          [3, 67, 41, 13, 68, 42],
          [15, 54, 24, 5, 55, 25],
          [15, 43, 15, 10, 44, 16],
          // 21
          [4, 144, 116, 4, 145, 117],
          [17, 68, 42],
          [17, 50, 22, 6, 51, 23],
          [19, 46, 16, 6, 47, 17],
          // 22
          [2, 139, 111, 7, 140, 112],
          [17, 74, 46],
          [7, 54, 24, 16, 55, 25],
          [34, 37, 13],
          // 23
          [4, 151, 121, 5, 152, 122],
          [4, 75, 47, 14, 76, 48],
          [11, 54, 24, 14, 55, 25],
          [16, 45, 15, 14, 46, 16],
          // 24
          [6, 147, 117, 4, 148, 118],
          [6, 73, 45, 14, 74, 46],
          [11, 54, 24, 16, 55, 25],
          [30, 46, 16, 2, 47, 17],
          // 25
          [8, 132, 106, 4, 133, 107],
          [8, 75, 47, 13, 76, 48],
          [7, 54, 24, 22, 55, 25],
          [22, 45, 15, 13, 46, 16],
          // 26
          [10, 142, 114, 2, 143, 115],
          [19, 74, 46, 4, 75, 47],
          [28, 50, 22, 6, 51, 23],
          [33, 46, 16, 4, 47, 17],
          // 27
          [8, 152, 122, 4, 153, 123],
          [22, 73, 45, 3, 74, 46],
          [8, 53, 23, 26, 54, 24],
          [12, 45, 15, 28, 46, 16],
          // 28
          [3, 147, 117, 10, 148, 118],
          [3, 73, 45, 23, 74, 46],
          [4, 54, 24, 31, 55, 25],
          [11, 45, 15, 31, 46, 16],
          // 29
          [7, 146, 116, 7, 147, 117],
          [21, 73, 45, 7, 74, 46],
          [1, 53, 23, 37, 54, 24],
          [19, 45, 15, 26, 46, 16],
          // 30
          [5, 145, 115, 10, 146, 116],
          [19, 75, 47, 10, 76, 48],
          [15, 54, 24, 25, 55, 25],
          [23, 45, 15, 25, 46, 16],
          // 31
          [13, 145, 115, 3, 146, 116],
          [2, 74, 46, 29, 75, 47],
          [42, 54, 24, 1, 55, 25],
          [23, 45, 15, 28, 46, 16],
          // 32
          [17, 145, 115],
          [10, 74, 46, 23, 75, 47],
          [10, 54, 24, 35, 55, 25],
          [19, 45, 15, 35, 46, 16],
          // 33
          [17, 145, 115, 1, 146, 116],
          [14, 74, 46, 21, 75, 47],
          [29, 54, 24, 19, 55, 25],
          [11, 45, 15, 46, 46, 16],
          // 34
          [13, 145, 115, 6, 146, 116],
          [14, 74, 46, 23, 75, 47],
          [44, 54, 24, 7, 55, 25],
          [59, 46, 16, 1, 47, 17],
          // 35
          [12, 151, 121, 7, 152, 122],
          [12, 75, 47, 26, 76, 48],
          [39, 54, 24, 14, 55, 25],
          [22, 45, 15, 41, 46, 16],
          // 36
          [6, 151, 121, 14, 152, 122],
          [6, 75, 47, 34, 76, 48],
          [46, 54, 24, 10, 55, 25],
          [2, 45, 15, 64, 46, 16],
          // 37
          [17, 152, 122, 4, 153, 123],
          [29, 74, 46, 14, 75, 47],
          [49, 54, 24, 10, 55, 25],
          [24, 45, 15, 46, 46, 16],
          // 38
          [4, 152, 122, 18, 153, 123],
          [13, 74, 46, 32, 75, 47],
          [48, 54, 24, 14, 55, 25],
          [42, 45, 15, 32, 46, 16],
          // 39
          [20, 147, 117, 4, 148, 118],
          [40, 75, 47, 7, 76, 48],
          [43, 54, 24, 22, 55, 25],
          [10, 45, 15, 67, 46, 16],
          // 40
          [19, 148, 118, 6, 149, 119],
          [18, 75, 47, 31, 76, 48],
          [34, 54, 24, 34, 55, 25],
          [20, 45, 15, 61, 46, 16]
        ];
        var qrRSBlock = function(totalCount, dataCount) {
          var _this2 = {};
          _this2.totalCount = totalCount;
          _this2.dataCount = dataCount;
          return _this2;
        };
        var _this = {};
        var getRsBlockTable = function(typeNumber, errorCorrectionLevel) {
          switch (errorCorrectionLevel) {
            case QRErrorCorrectionLevel.L:
              return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
            case QRErrorCorrectionLevel.M:
              return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
            case QRErrorCorrectionLevel.Q:
              return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
            case QRErrorCorrectionLevel.H:
              return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
            default:
              return void 0;
          }
        };
        _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {
          var rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);
          if (typeof rsBlock == "undefined") {
            throw "bad rs block @ typeNumber:" + typeNumber + "/errorCorrectionLevel:" + errorCorrectionLevel;
          }
          var length = rsBlock.length / 3;
          var list = [];
          for (var i = 0; i < length; i += 1) {
            var count = rsBlock[i * 3 + 0];
            var totalCount = rsBlock[i * 3 + 1];
            var dataCount = rsBlock[i * 3 + 2];
            for (var j = 0; j < count; j += 1) {
              list.push(qrRSBlock(totalCount, dataCount));
            }
          }
          return list;
        };
        return _this;
      }();
      var qrBitBuffer = function() {
        var _buffer = [];
        var _length = 0;
        var _this = {};
        _this.getBuffer = function() {
          return _buffer;
        };
        _this.getAt = function(index) {
          var bufIndex = Math.floor(index / 8);
          return (_buffer[bufIndex] >>> 7 - index % 8 & 1) == 1;
        };
        _this.put = function(num, length) {
          for (var i = 0; i < length; i += 1) {
            _this.putBit((num >>> length - i - 1 & 1) == 1);
          }
        };
        _this.getLengthInBits = function() {
          return _length;
        };
        _this.putBit = function(bit) {
          var bufIndex = Math.floor(_length / 8);
          if (_buffer.length <= bufIndex) {
            _buffer.push(0);
          }
          if (bit) {
            _buffer[bufIndex] |= 128 >>> _length % 8;
          }
          _length += 1;
        };
        return _this;
      };
      var qrNumber = function(data) {
        var _mode = QRMode.MODE_NUMBER;
        var _data = data;
        var _this = {};
        _this.getMode = function() {
          return _mode;
        };
        _this.getLength = function(buffer) {
          return _data.length;
        };
        _this.write = function(buffer) {
          var data2 = _data;
          var i = 0;
          while (i + 2 < data2.length) {
            buffer.put(strToNum(data2.substring(i, i + 3)), 10);
            i += 3;
          }
          if (i < data2.length) {
            if (data2.length - i == 1) {
              buffer.put(strToNum(data2.substring(i, i + 1)), 4);
            } else if (data2.length - i == 2) {
              buffer.put(strToNum(data2.substring(i, i + 2)), 7);
            }
          }
        };
        var strToNum = function(s) {
          var num = 0;
          for (var i = 0; i < s.length; i += 1) {
            num = num * 10 + chatToNum(s.charAt(i));
          }
          return num;
        };
        var chatToNum = function(c) {
          if ("0" <= c && c <= "9") {
            return c.charCodeAt(0) - "0".charCodeAt(0);
          }
          throw "illegal char :" + c;
        };
        return _this;
      };
      var qrAlphaNum = function(data) {
        var _mode = QRMode.MODE_ALPHA_NUM;
        var _data = data;
        var _this = {};
        _this.getMode = function() {
          return _mode;
        };
        _this.getLength = function(buffer) {
          return _data.length;
        };
        _this.write = function(buffer) {
          var s = _data;
          var i = 0;
          while (i + 1 < s.length) {
            buffer.put(
              getCode(s.charAt(i)) * 45 + getCode(s.charAt(i + 1)),
              11
            );
            i += 2;
          }
          if (i < s.length) {
            buffer.put(getCode(s.charAt(i)), 6);
          }
        };
        var getCode = function(c) {
          if ("0" <= c && c <= "9") {
            return c.charCodeAt(0) - "0".charCodeAt(0);
          } else if ("A" <= c && c <= "Z") {
            return c.charCodeAt(0) - "A".charCodeAt(0) + 10;
          } else {
            switch (c) {
              case " ":
                return 36;
              case "$":
                return 37;
              case "%":
                return 38;
              case "*":
                return 39;
              case "+":
                return 40;
              case "-":
                return 41;
              case ".":
                return 42;
              case "/":
                return 43;
              case ":":
                return 44;
              default:
                throw "illegal char :" + c;
            }
          }
        };
        return _this;
      };
      var qr8BitByte = function(data) {
        var _mode = QRMode.MODE_8BIT_BYTE;
        var _data = data;
        var _bytes = qrcode2.stringToBytes(data);
        var _this = {};
        _this.getMode = function() {
          return _mode;
        };
        _this.getLength = function(buffer) {
          return _bytes.length;
        };
        _this.write = function(buffer) {
          for (var i = 0; i < _bytes.length; i += 1) {
            buffer.put(_bytes[i], 8);
          }
        };
        return _this;
      };
      var qrKanji = function(data) {
        var _mode = QRMode.MODE_KANJI;
        var _data = data;
        var stringToBytes = qrcode2.stringToBytesFuncs["SJIS"];
        if (!stringToBytes) {
          throw "sjis not supported.";
        }
        !function(c, code) {
          var test = stringToBytes(c);
          if (test.length != 2 || (test[0] << 8 | test[1]) != code) {
            throw "sjis not supported.";
          }
        }("\u53CB", 38726);
        var _bytes = stringToBytes(data);
        var _this = {};
        _this.getMode = function() {
          return _mode;
        };
        _this.getLength = function(buffer) {
          return ~~(_bytes.length / 2);
        };
        _this.write = function(buffer) {
          var data2 = _bytes;
          var i = 0;
          while (i + 1 < data2.length) {
            var c = (255 & data2[i]) << 8 | 255 & data2[i + 1];
            if (33088 <= c && c <= 40956) {
              c -= 33088;
            } else if (57408 <= c && c <= 60351) {
              c -= 49472;
            } else {
              throw "illegal char at " + (i + 1) + "/" + c;
            }
            c = (c >>> 8 & 255) * 192 + (c & 255);
            buffer.put(c, 13);
            i += 2;
          }
          if (i < data2.length) {
            throw "illegal char at " + (i + 1);
          }
        };
        return _this;
      };
      var byteArrayOutputStream = function() {
        var _bytes = [];
        var _this = {};
        _this.writeByte = function(b) {
          _bytes.push(b & 255);
        };
        _this.writeShort = function(i) {
          _this.writeByte(i);
          _this.writeByte(i >>> 8);
        };
        _this.writeBytes = function(b, off, len) {
          off = off || 0;
          len = len || b.length;
          for (var i = 0; i < len; i += 1) {
            _this.writeByte(b[i + off]);
          }
        };
        _this.writeString = function(s) {
          for (var i = 0; i < s.length; i += 1) {
            _this.writeByte(s.charCodeAt(i));
          }
        };
        _this.toByteArray = function() {
          return _bytes;
        };
        _this.toString = function() {
          var s = "";
          s += "[";
          for (var i = 0; i < _bytes.length; i += 1) {
            if (i > 0) {
              s += ",";
            }
            s += _bytes[i];
          }
          s += "]";
          return s;
        };
        return _this;
      };
      var base64EncodeOutputStream = function() {
        var _buffer = 0;
        var _buflen = 0;
        var _length = 0;
        var _base64 = "";
        var _this = {};
        var writeEncoded = function(b) {
          _base64 += String.fromCharCode(encode(b & 63));
        };
        var encode = function(n) {
          if (n < 0) {
          } else if (n < 26) {
            return 65 + n;
          } else if (n < 52) {
            return 97 + (n - 26);
          } else if (n < 62) {
            return 48 + (n - 52);
          } else if (n == 62) {
            return 43;
          } else if (n == 63) {
            return 47;
          }
          throw "n:" + n;
        };
        _this.writeByte = function(n) {
          _buffer = _buffer << 8 | n & 255;
          _buflen += 8;
          _length += 1;
          while (_buflen >= 6) {
            writeEncoded(_buffer >>> _buflen - 6);
            _buflen -= 6;
          }
        };
        _this.flush = function() {
          if (_buflen > 0) {
            writeEncoded(_buffer << 6 - _buflen);
            _buffer = 0;
            _buflen = 0;
          }
          if (_length % 3 != 0) {
            var padlen = 3 - _length % 3;
            for (var i = 0; i < padlen; i += 1) {
              _base64 += "=";
            }
          }
        };
        _this.toString = function() {
          return _base64;
        };
        return _this;
      };
      var base64DecodeInputStream = function(str) {
        var _str = str;
        var _pos = 0;
        var _buffer = 0;
        var _buflen = 0;
        var _this = {};
        _this.read = function() {
          while (_buflen < 8) {
            if (_pos >= _str.length) {
              if (_buflen == 0) {
                return -1;
              }
              throw "unexpected end of file./" + _buflen;
            }
            var c = _str.charAt(_pos);
            _pos += 1;
            if (c == "=") {
              _buflen = 0;
              return -1;
            } else if (c.match(/^\s$/)) {
              continue;
            }
            _buffer = _buffer << 6 | decode(c.charCodeAt(0));
            _buflen += 6;
          }
          var n = _buffer >>> _buflen - 8 & 255;
          _buflen -= 8;
          return n;
        };
        var decode = function(c) {
          if (65 <= c && c <= 90) {
            return c - 65;
          } else if (97 <= c && c <= 122) {
            return c - 97 + 26;
          } else if (48 <= c && c <= 57) {
            return c - 48 + 52;
          } else if (c == 43) {
            return 62;
          } else if (c == 47) {
            return 63;
          } else {
            throw "c:" + c;
          }
        };
        return _this;
      };
      var gifImage = function(width, height) {
        var _width = width;
        var _height = height;
        var _data = new Array(width * height);
        var _this = {};
        _this.setPixel = function(x, y, pixel) {
          _data[y * _width + x] = pixel;
        };
        _this.write = function(out) {
          out.writeString("GIF87a");
          out.writeShort(_width);
          out.writeShort(_height);
          out.writeByte(128);
          out.writeByte(0);
          out.writeByte(0);
          out.writeByte(0);
          out.writeByte(0);
          out.writeByte(0);
          out.writeByte(255);
          out.writeByte(255);
          out.writeByte(255);
          out.writeString(",");
          out.writeShort(0);
          out.writeShort(0);
          out.writeShort(_width);
          out.writeShort(_height);
          out.writeByte(0);
          var lzwMinCodeSize = 2;
          var raster = getLZWRaster(lzwMinCodeSize);
          out.writeByte(lzwMinCodeSize);
          var offset = 0;
          while (raster.length - offset > 255) {
            out.writeByte(255);
            out.writeBytes(raster, offset, 255);
            offset += 255;
          }
          out.writeByte(raster.length - offset);
          out.writeBytes(raster, offset, raster.length - offset);
          out.writeByte(0);
          out.writeString(";");
        };
        var bitOutputStream = function(out) {
          var _out = out;
          var _bitLength = 0;
          var _bitBuffer = 0;
          var _this2 = {};
          _this2.write = function(data, length) {
            if (data >>> length != 0) {
              throw "length over";
            }
            while (_bitLength + length >= 8) {
              _out.writeByte(255 & (data << _bitLength | _bitBuffer));
              length -= 8 - _bitLength;
              data >>>= 8 - _bitLength;
              _bitBuffer = 0;
              _bitLength = 0;
            }
            _bitBuffer = data << _bitLength | _bitBuffer;
            _bitLength = _bitLength + length;
          };
          _this2.flush = function() {
            if (_bitLength > 0) {
              _out.writeByte(_bitBuffer);
            }
          };
          return _this2;
        };
        var getLZWRaster = function(lzwMinCodeSize) {
          var clearCode = 1 << lzwMinCodeSize;
          var endCode = (1 << lzwMinCodeSize) + 1;
          var bitLength = lzwMinCodeSize + 1;
          var table = lzwTable();
          for (var i = 0; i < clearCode; i += 1) {
            table.add(String.fromCharCode(i));
          }
          table.add(String.fromCharCode(clearCode));
          table.add(String.fromCharCode(endCode));
          var byteOut = byteArrayOutputStream();
          var bitOut = bitOutputStream(byteOut);
          bitOut.write(clearCode, bitLength);
          var dataIndex = 0;
          var s = String.fromCharCode(_data[dataIndex]);
          dataIndex += 1;
          while (dataIndex < _data.length) {
            var c = String.fromCharCode(_data[dataIndex]);
            dataIndex += 1;
            if (table.contains(s + c)) {
              s = s + c;
            } else {
              bitOut.write(table.indexOf(s), bitLength);
              if (table.size() < 4095) {
                if (table.size() == 1 << bitLength) {
                  bitLength += 1;
                }
                table.add(s + c);
              }
              s = c;
            }
          }
          bitOut.write(table.indexOf(s), bitLength);
          bitOut.write(endCode, bitLength);
          bitOut.flush();
          return byteOut.toByteArray();
        };
        var lzwTable = function() {
          var _map = {};
          var _size = 0;
          var _this2 = {};
          _this2.add = function(key) {
            if (_this2.contains(key)) {
              throw "dup key:" + key;
            }
            _map[key] = _size;
            _size += 1;
          };
          _this2.size = function() {
            return _size;
          };
          _this2.indexOf = function(key) {
            return _map[key];
          };
          _this2.contains = function(key) {
            return typeof _map[key] != "undefined";
          };
          return _this2;
        };
        return _this;
      };
      var createDataURL = function(width, height, getPixel) {
        var gif = gifImage(width, height);
        for (var y = 0; y < height; y += 1) {
          for (var x = 0; x < width; x += 1) {
            gif.setPixel(x, y, getPixel(x, y));
          }
        }
        var b = byteArrayOutputStream();
        gif.write(b);
        var base64 = base64EncodeOutputStream();
        var bytes = b.toByteArray();
        for (var i = 0; i < bytes.length; i += 1) {
          base64.writeByte(bytes[i]);
        }
        base64.flush();
        return "data:image/gif;base64," + base64;
      };
      return qrcode2;
    }();
    !function() {
      qrcode.stringToBytesFuncs["UTF-8"] = function(s) {
        function toUTF8Array(str) {
          var utf8 = [];
          for (var i = 0; i < str.length; i++) {
            var charcode = str.charCodeAt(i);
            if (charcode < 128) utf8.push(charcode);
            else if (charcode < 2048) {
              utf8.push(
                192 | charcode >> 6,
                128 | charcode & 63
              );
            } else if (charcode < 55296 || charcode >= 57344) {
              utf8.push(
                224 | charcode >> 12,
                128 | charcode >> 6 & 63,
                128 | charcode & 63
              );
            } else {
              i++;
              charcode = 65536 + ((charcode & 1023) << 10 | str.charCodeAt(i) & 1023);
              utf8.push(
                240 | charcode >> 18,
                128 | charcode >> 12 & 63,
                128 | charcode >> 6 & 63,
                128 | charcode & 63
              );
            }
          }
          return utf8;
        }
        return toUTF8Array(s);
      };
    }();
    (function(factory) {
      if (typeof define === "function" && define.amd) {
        define([], factory);
      } else if (typeof exports2 === "object") {
        module2.exports = factory();
      }
    })(function() {
      return qrcode;
    });
  }
});

// src/qr.js
var require_qr = __commonJS({
  "src/qr.js"(exports2, module2) {
    "use strict";
    var qrcode = require_qrcode();
    function qrSvg2(text) {
      const qr = qrcode(0, "M");
      qr.addData(text);
      qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    }
    module2.exports = { qrSvg: qrSvg2 };
  }
});

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports2, module2) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module2.exports = {
      BINARY_TYPES,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
      kListener: Symbol("kListener"),
      kStatusCode: Symbol("status-code"),
      kWebSocket: Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports2, module2) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module2.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = require("bufferutil");
        module2.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module2.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports2, module2) {
    "use strict";
    var kDone = Symbol("kDone");
    var kRun = Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module2.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports2, module2) {
    "use strict";
    var zlib = require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = Symbol("permessage-deflate");
    var kTotalLength = Symbol("total-length");
    var kCallback = Symbol("callback");
    var kBuffers = Symbol("buffers");
    var kError = Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       * @param {Boolean} [isServer=false] Create the instance in either server or
       *     client mode
       * @param {Number} [maxPayload=0] The maximum allowed message length
       */
      constructor(options, isServer, maxPayload) {
        this._maxPayload = maxPayload | 0;
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._isServer = !!isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module2.exports = PerMessageDeflate;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports2, module2) {
    "use strict";
    var { isUtf8 } = require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module2.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module2.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = require("utf-8-validate");
        module2.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports2, module2) {
    "use strict";
    var { Writable } = require("stream");
    var PerMessageDeflate = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module2.exports = Receiver;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports2, module2) {
    "use strict";
    var { Duplex } = require("stream");
    var { randomFillSync } = require("crypto");
    var PerMessageDeflate = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else {
            buf.set(data, 2);
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {Buffer[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module2.exports = Sender;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports2, module2) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = Symbol("kCode");
    var kData = Symbol("kData");
    var kError = Symbol("kError");
    var kMessage = Symbol("kMessage");
    var kReason = Symbol("kReason");
    var kTarget = Symbol("kTarget");
    var kType = Symbol("kType");
    var kWasClean = Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module2.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start2 = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start2 === -1) start2 = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start2 !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start2 === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start2, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start2 = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start2 === -1) start2 = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start2 !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start2 === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start2, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start2 = end = -1;
          } else if (code === 61 && start2 !== -1 && end === -1) {
            paramName = header.slice(start2, i);
            start2 = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start2 === -1) start2 = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start2 === -1) start2 = i;
            } else if (code === 34 && start2 !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start2 === -1) start2 = i;
          } else if (start2 !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start2 === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start2, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start2 = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start2 === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start2, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension) => {
        let configurations = extensions[extension];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module2.exports = { format, parse };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events");
    var https = require("https");
    var http = require("http");
    var net = require("net");
    var tls = require("tls");
    var { randomBytes, createHash } = require("crypto");
    var { Duplex, Readable } = require("stream");
    var { URL: URL2 } = require("url");
    var PerMessageDeflate = require_permessage_deflate();
    var Receiver = require_receiver();
    var Sender = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var closeTimeout = 30 * 1e3;
    var kAborted = Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate.extensionName]) {
          this._extensions[PerMessageDeflate.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket.prototype.addEventListener = addEventListener;
    WebSocket.prototype.removeEventListener = removeEventListener;
    module2.exports = WebSocket;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        protocolVersion: protocolVersions[1],
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch (e) {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate(
          opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
          false,
          opts.maxPayload
        );
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket.CLOSED) return;
      if (websocket.readyState === WebSocket.OPEN) {
        websocket._readyState = WebSocket.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket.CLOSING;
      let chunk;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && (chunk = websocket._socket.read()) !== null) {
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "node_modules/ws/lib/stream.js"(exports2, module2) {
    "use strict";
    var { Duplex } = require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module2.exports = createWebSocketStream;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start2 = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start2 === -1) start2 = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start2 !== -1) end = i;
        } else if (code === 44) {
          if (start2 === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start2, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start2 = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start2 === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start2, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module2.exports = { parse };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events");
    var http = require("http");
    var { Duplex } = require("stream");
    var { createHash } = require("crypto");
    var extension = require_extension();
    var PerMessageDeflate = require_permessage_deflate();
    var subprotocol = require_subprotocol();
    var WebSocket = require_websocket();
    var { GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server2 = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server2.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 8 && version !== 13) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate(
            this.options.perMessageDeflate,
            true,
            this.options.maxPayload
          );
          try {
            const offers = extension.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
              extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate.extensionName]) {
          const params = extensions[PerMessageDeflate.extensionName].params;
          const value = extension.format({
            [PerMessageDeflate.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module2.exports = WebSocketServer;
    function addListeners(server2, map) {
      for (const event of Object.keys(map)) server2.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server2.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server2) {
      server2._state = CLOSED;
      server2.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server2, req, socket, code, message) {
      if (server2.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server2.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message);
      }
    }
  }
});

// node_modules/ws/index.js
var require_ws = __commonJS({
  "node_modules/ws/index.js"(exports2, module2) {
    "use strict";
    var WebSocket = require_websocket();
    WebSocket.createWebSocketStream = require_stream();
    WebSocket.Server = require_websocket_server();
    WebSocket.Receiver = require_receiver();
    WebSocket.Sender = require_sender();
    WebSocket.WebSocket = WebSocket;
    WebSocket.WebSocketServer = WebSocket.Server;
    module2.exports = WebSocket;
  }
});

// src/relay.js
var require_relay = __commonJS({
  "src/relay.js"(exports2, module2) {
    "use strict";
    var http = require("http");
    var crypto = require("crypto");
    var WebSocket = require_ws();
    function parseConnectString2(s) {
      const str = String(s || "").trim();
      const m = str.match(/^(https?):\/\/([^/#?\s]+)\/?#(.+)$/i);
      if (!m) throw new Error("\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 https://\u0E42\u0E14\u0E40\u0E21\u0E19#key=... (\u0E04\u0E31\u0E14\u0E25\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E44\u0E1F\u0E25\u0E4C connect-string.txt \u0E1A\u0E19 VPS)");
      const params = new URLSearchParams(m[3]);
      const key = params.get("key");
      const pin = (params.get("pin") || "").toLowerCase().replace(/[^0-9a-f]/g, "");
      if (!key || key.length < 16) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A key \u0E43\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E17\u0E35\u0E48\u0E27\u0E32\u0E07");
      const scheme = m[1].toLowerCase();
      return {
        origin: `${scheme}://${m[2]}`,
        url: `${scheme === "https" ? "wss" : "ws"}://${m[2]}/_ms_agent`,
        key,
        pin: pin || null
      };
    }
    var RelayClient2 = class {
      /**
       * @param {{ connect: string, localHost: string, localPort: number, agentNonce: string,
       *           onStatus?: (s: 'connecting'|'online'|'offline'|'denied', detail?: string) => void }} opts
       */
      constructor(opts) {
        this.opts = opts;
        this.cfg = parseConnectString2(opts.connect);
        this.ws = null;
        this.stopped = false;
        this.retry = 1e3;
        this.reqs = /* @__PURE__ */ new Map();
        this.status = "offline";
      }
      get origin() {
        return this.cfg.origin;
      }
      setStatus(s, detail) {
        this.status = s;
        if (this.opts.onStatus) this.opts.onStatus(s, detail);
      }
      start() {
        this.stopped = false;
        this.connect();
      }
      stop() {
        this.stopped = true;
        clearTimeout(this.timer);
        for (const r of this.reqs.values()) r.destroy();
        this.reqs.clear();
        if (this.ws) this.ws.terminate();
        this.ws = null;
        this.setStatus("offline");
      }
      connect() {
        if (this.stopped) return;
        this.setStatus("connecting");
        const { url, pin } = this.cfg;
        const ws = new WebSocket(url, { rejectUnauthorized: !pin, handshakeTimeout: 15e3, perMessageDeflate: false });
        this.ws = ws;
        let authed = false;
        ws.on("message", (data) => {
          let m;
          try {
            m = JSON.parse(data.toString());
          } catch {
            return;
          }
          if (!authed) {
            if (m.t === "challenge") {
              if (pin) {
                const cert = ws._socket && ws._socket.getPeerCertificate && ws._socket.getPeerCertificate();
                const fp = cert && cert.fingerprint256 ? cert.fingerprint256.replace(/:/g, "").toLowerCase() : "";
                if (fp !== pin) {
                  this.setStatus("denied", "\u0E43\u0E1A\u0E23\u0E31\u0E1A\u0E23\u0E2D\u0E07\u0E02\u0E2D\u0E07 VPS \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E17\u0E35\u0E48\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E27\u0E49 (\u0E2D\u0E32\u0E08\u0E21\u0E35\u0E04\u0E19\u0E14\u0E31\u0E01\u0E01\u0E25\u0E32\u0E07\u0E17\u0E32\u0E07 \u0E2B\u0E23\u0E37\u0E2D VPS \u0E2A\u0E23\u0E49\u0E32\u0E07\u0E43\u0E1A\u0E23\u0E31\u0E1A\u0E23\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48)");
                  this.stopped = true;
                  ws.terminate();
                  return;
                }
              }
              const mac = crypto.createHmac("sha256", this.cfg.key).update(m.n).digest("hex");
              ws.send(JSON.stringify({ t: "auth", mac }));
            } else if (m.t === "ok") {
              authed = true;
              this.retry = 1e3;
              this.setStatus("online");
            } else if (m.t === "denied") {
              this.stopped = true;
              this.setStatus("denied", "VPS \u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18 key \u0E19\u0E35\u0E49 (key \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A relay-config.json \u0E1A\u0E19 VPS)");
              ws.terminate();
            }
            return;
          }
          if (m.t === "req") this.forward(m);
          else if (m.t === "cancel") {
            const r = this.reqs.get(m.id);
            if (r) r.destroy();
            this.reqs.delete(m.id);
          }
        });
        ws.on("error", () => {
        });
        ws.on("close", () => {
          for (const r of this.reqs.values()) r.destroy();
          this.reqs.clear();
          if (this.ws === ws) this.ws = null;
          if (this.stopped) return;
          this.setStatus("offline");
          this.timer = setTimeout(() => this.connect(), this.retry);
          this.retry = Math.min(this.retry * 2, 3e4);
        });
      }
      send(obj) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
      }
      forward(m) {
        const { id } = m;
        const headers = { ...m.h || {} };
        for (const k of Object.keys(headers)) if (k.startsWith("x-mobile-sync-")) delete headers[k];
        headers["x-mobile-sync-remote"] = String(m.ip || "");
        headers["x-mobile-sync-agent"] = this.opts.agentNonce;
        const body = m.b ? Buffer.from(m.b, "base64") : null;
        if (body) headers["content-length"] = String(body.length);
        const req = http.request(
          { host: this.opts.localHost, port: this.opts.localPort, method: m.m, path: m.p, headers },
          (res) => {
            const h = {};
            for (const [k, v] of Object.entries(res.headers)) h[k] = Array.isArray(v) ? v.join(", ") : String(v);
            this.send({ t: "head", id, s: res.statusCode, h });
            res.on("data", (chunk) => this.send({ t: "data", id, b: chunk.toString("base64") }));
            res.on("end", () => {
              this.reqs.delete(id);
              this.send({ t: "end", id });
            });
            res.on("error", () => {
              this.reqs.delete(id);
              this.send({ t: "end", id });
            });
          }
        );
        req.on("error", () => {
          if (!this.reqs.has(id)) return;
          this.reqs.delete(id);
          this.send({ t: "head", id, s: 502, h: { "content-type": "text/plain" } });
          this.send({ t: "end", id });
        });
        this.reqs.set(id, req);
        req.end(body || void 0);
      }
    };
    module2.exports = { RelayClient: RelayClient2, parseConnectString: parseConnectString2 };
  }
});

// src/extension.js
var vscode = require("vscode");
var { SyncServer } = require_server();
var { qrSvg } = require_qr();
var { RelayClient, parseConnectString } = require_relay();
var SECRET_KEY = "mobileSync.token";
var RELAY_KEY = "mobileSync.relay";
var server = null;
var relay = null;
var statusItem = null;
function config() {
  const c = vscode.workspace.getConfiguration("mobileSync");
  return {
    port: c.get("port", 8765),
    host: c.get("host", "0.0.0.0"),
    notifyOnConnect: c.get("notifyOnConnect", true),
    allowCommands: c.get("allowCommands", true)
  };
}
async function getToken(context, reset = false) {
  let token = reset ? void 0 : await context.secrets.get(SECRET_KEY);
  if (!token) {
    token = require("crypto").randomBytes(24).toString("base64url");
    await context.secrets.store(SECRET_KEY, token);
  }
  return token;
}
function updateStatus() {
  if (!statusItem) return;
  if (server && server.listening) {
    const n = server.clientCount();
    const vps = relay ? { online: " \xB7 VPS \u2713", connecting: " \xB7 VPS \u2026", offline: " \xB7 VPS \u2717", denied: " \xB7 VPS \u2717" }[relay.status] : "";
    statusItem.text = `$(device-mobile) Mobile Sync: ${n ? n + " connected" : "on"}${vps}`;
    statusItem.tooltip = "Mobile Sync \u0E01\u0E33\u0E25\u0E31\u0E07\u0E17\u0E33\u0E07\u0E32\u0E19 \u2014 \u0E01\u0E14\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1B\u0E34\u0E14\u0E40\u0E21\u0E19\u0E39";
    statusItem.command = "mobileSync.menu";
  } else {
    statusItem.text = "$(device-mobile) Mobile Sync: off";
    statusItem.tooltip = "\u0E01\u0E14\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1B\u0E34\u0E14\u0E40\u0E21\u0E19\u0E39 Mobile Sync";
    statusItem.command = "mobileSync.menu";
  }
  statusItem.show();
}
async function start(context) {
  if (server && server.listening) {
    showLink();
    return;
  }
  const cfg = config();
  const token = await getToken(context);
  server = new SyncServer(vscode, {
    port: cfg.port,
    host: cfg.host,
    token,
    allowCommands: cfg.allowCommands,
    agentNonce: require("crypto").randomBytes(24).toString("base64url"),
    mediaDir: vscode.Uri.joinPath(context.extensionUri, "media").fsPath,
    onClientsChanged: (info) => {
      updateStatus();
      if (info && info.connected && config().notifyOnConnect) {
        vscode.window.showInformationMessage(`Mobile Sync: \u0E21\u0E35\u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32\u0E08\u0E32\u0E01 ${info.address} (\u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E04\u0E38\u0E13 \u0E43\u0E2B\u0E49\u0E01\u0E14 Stop \u0E41\u0E25\u0E49\u0E27 Reset Secret Key)`);
      }
    },
    onSuspicious: (address) => {
      vscode.window.showWarningMessage(
        `Mobile Sync: \u0E1A\u0E25\u0E47\u0E2D\u0E01 ${address} \u0E41\u0E25\u0E49\u0E27 \u0E40\u0E1E\u0E23\u0E32\u0E30\u0E43\u0E2A\u0E48\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E34\u0E14\u0E2B\u0E25\u0E32\u0E22\u0E04\u0E23\u0E31\u0E49\u0E07`
      );
    }
  });
  try {
    await server.listen();
  } catch (err) {
    server = null;
    vscode.window.showErrorMessage(`Mobile Sync: \u0E40\u0E1B\u0E34\u0E14\u0E40\u0E0B\u0E34\u0E23\u0E4C\u0E1F\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49: ${err.message} (\u0E16\u0E49\u0E32\u0E1E\u0E2D\u0E23\u0E4C\u0E15\u0E0A\u0E19 \u0E43\u0E2B\u0E49\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19 mobileSync.port \u0E43\u0E19 Settings)`);
    updateStatus();
    return;
  }
  await startRelay(context);
  updateStatus();
  showLink();
}
async function startRelay(context) {
  if (relay) relay.stop();
  relay = null;
  const connect = await context.secrets.get(RELAY_KEY);
  if (!connect || !server || !server.listening) return;
  const host = server.opts.host;
  try {
    relay = new RelayClient({
      connect,
      localHost: !host || host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host,
      localPort: server.port,
      agentNonce: server.opts.agentNonce,
      onStatus: (st, detail) => {
        updateStatus();
        if (st === "denied") vscode.window.showErrorMessage(`Mobile Sync: \u0E15\u0E48\u0E2D VPS \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u2014 ${detail}`);
      }
    });
  } catch (err) {
    vscode.window.showErrorMessage(`Mobile Sync: \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 VPS \u0E17\u0E35\u0E48\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E27\u0E49\u0E43\u0E0A\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49: ${err.message}`);
    return;
  }
  relay.start();
}
async function connectRelay(context) {
  const value = await vscode.window.showInputBox({
    title: "Mobile Sync: \u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E1C\u0E48\u0E32\u0E19 VPS",
    prompt: "\u0E27\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E08\u0E32\u0E01\u0E44\u0E1F\u0E25\u0E4C connect-string.txt \u0E1A\u0E19 VPS (\u0E02\u0E36\u0E49\u0E19\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 https://)",
    placeHolder: "https://mycode.duckdns.org#key=...",
    password: true,
    ignoreFocusOut: true,
    validateInput: (v) => {
      try {
        parseConnectString(v);
        return null;
      } catch (err) {
        return err.message;
      }
    }
  });
  if (!value) return;
  await context.secrets.store(RELAY_KEY, value.trim());
  if (server && server.listening) {
    await startRelay(context);
    updateStatus();
    vscode.window.showInformationMessage("Mobile Sync: \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D VPS\u2026");
  } else {
    vscode.window.showInformationMessage("Mobile Sync: \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E41\u0E25\u0E49\u0E27 \u0E08\u0E30\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D VPS \u0E40\u0E21\u0E37\u0E48\u0E2D\u0E2A\u0E31\u0E48\u0E07 Start");
  }
}
async function disconnectRelay(context) {
  await context.secrets.delete(RELAY_KEY);
  if (relay) relay.stop();
  relay = null;
  updateStatus();
  vscode.window.showInformationMessage("Mobile Sync: \u0E40\u0E25\u0E34\u0E01\u0E43\u0E0A\u0E49 VPS \u0E41\u0E25\u0E49\u0E27");
}
async function stop() {
  if (relay) relay.stop();
  relay = null;
  if (server) {
    await server.close();
    server = null;
  }
  updateStatus();
  vscode.window.showInformationMessage("Mobile Sync: \u0E1B\u0E34\u0E14\u0E41\u0E25\u0E49\u0E27 \u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D\u0E16\u0E39\u0E01\u0E15\u0E31\u0E14\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D");
}
var linkPanel = null;
function showLink() {
  if (!server || !server.listening) {
    vscode.window.showWarningMessage('Mobile Sync \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E1B\u0E34\u0E14 \u2014 \u0E2A\u0E31\u0E48\u0E07 "Mobile Sync: Start" \u0E01\u0E48\u0E2D\u0E19');
    return;
  }
  const urls = server.urls().filter((u) => !/\/\/(127\.|localhost|\[::1\])/.test(u.url));
  if (relay) {
    urls.unshift({
      label: relay.cfg.pin ? "\u0E1C\u0E48\u0E32\u0E19 VPS (\u0E43\u0E0A\u0E49\u0E44\u0E14\u0E49\u0E17\u0E38\u0E01\u0E17\u0E35\u0E48 \u2014 \u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D\u0E08\u0E30\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E43\u0E1A\u0E23\u0E31\u0E1A\u0E23\u0E2D\u0E07 \u0E43\u0E2B\u0E49\u0E01\u0E14\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E15\u0E48\u0E2D)" : "\u0E1C\u0E48\u0E32\u0E19 VPS (\u0E43\u0E0A\u0E49\u0E44\u0E14\u0E49\u0E17\u0E38\u0E01\u0E17\u0E35\u0E48)",
      url: `${relay.origin}/#t=${encodeURIComponent(server.opts.token)}`,
      note: relay.status === "online" ? "" : "\u0E15\u0E2D\u0E19\u0E19\u0E35\u0E49\u0E22\u0E31\u0E07\u0E15\u0E48\u0E2D VPS \u0E44\u0E21\u0E48\u0E15\u0E34\u0E14"
    });
  }
  if (!urls.length) {
    vscode.window.showWarningMessage("Mobile Sync: \u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E40\u0E04\u0E23\u0E37\u0E2D\u0E02\u0E48\u0E32\u0E22 \u0E04\u0E2D\u0E21\u0E15\u0E48\u0E2D Wi-Fi \u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E1B\u0E25\u0E48\u0E32?");
    return;
  }
  if (linkPanel) {
    linkPanel.reveal();
  } else {
    linkPanel = vscode.window.createWebviewPanel("mobileSyncLink", "Mobile Sync", vscode.ViewColumn.Active, {
      enableScripts: false
    });
    linkPanel.onDidDispose(() => linkPanel = null);
  }
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const items = urls.map(
    (u) => `<section>
  <h2>${esc(u.label)}</h2>${u.note ? `<p class="warn">${esc(u.note)}</p>` : ""}
  <div class="qr">${qrSvg(u.url)}</div>
  <code>${esc(u.url)}</code>
</section>`
  ).join("\n");
  linkPanel.webview.html = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>
 body{font-family:var(--vscode-font-family);padding:16px;color:var(--vscode-foreground)}
 section{display:inline-block;vertical-align:top;margin:0 24px 24px 0;max-width:320px}
 .qr{background:#fff;padding:12px;border-radius:8px;width:260px;height:260px}
 .qr svg{width:100%;height:100%}
 code{display:block;word-break:break-all;margin-top:8px;user-select:all}
 .warn{color:var(--vscode-editorWarning-foreground)}
</style></head><body>
<h1>\u0E2A\u0E41\u0E01\u0E19 QR \u0E14\u0E49\u0E27\u0E22\u0E01\u0E25\u0E49\u0E2D\u0E07\u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D</h1>
<p>\u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E48\u0E2D Wi-Fi \u0E27\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E1A\u0E04\u0E2D\u0E21 \u0E2B\u0E23\u0E37\u0E2D\u0E17\u0E31\u0E49\u0E07\u0E2A\u0E2D\u0E07\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E40\u0E1B\u0E34\u0E14 Tailscale \u0E44\u0E27\u0E49</p>
<p class="warn">\u26A0 \u0E25\u0E34\u0E07\u0E01\u0E4C\u0E19\u0E35\u0E49\u0E21\u0E35\u0E23\u0E2B\u0E31\u0E2A\u0E25\u0E31\u0E1A\u0E2D\u0E22\u0E39\u0E48\u0E02\u0E49\u0E32\u0E07\u0E43\u0E19 \u0E2B\u0E49\u0E32\u0E21\u0E2A\u0E48\u0E07\u0E43\u0E2B\u0E49\u0E43\u0E04\u0E23\u0E2B\u0E23\u0E37\u0E2D\u0E42\u0E1E\u0E2A\u0E15\u0E4C\u0E17\u0E35\u0E48\u0E44\u0E2B\u0E19
 \u0E16\u0E49\u0E32\u0E2B\u0E25\u0E38\u0E14 \u0E43\u0E2B\u0E49\u0E2A\u0E31\u0E48\u0E07 <b>Mobile Sync: Reset Secret Key</b></p>
${items}
</body></html>`;
}
async function menu(context) {
  const running = server && server.listening;
  const hasRelay = !!await context.secrets.get(RELAY_KEY);
  const items = [];
  if (!running) items.push({ label: "$(play) \u0E40\u0E23\u0E34\u0E48\u0E21 Mobile Sync", run: () => start(context) });
  else {
    items.push({ label: "$(device-mobile) \u0E41\u0E2A\u0E14\u0E07 QR / \u0E25\u0E34\u0E07\u0E01\u0E4C\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D", run: () => showLink() });
    items.push({ label: "$(debug-stop) \u0E2B\u0E22\u0E38\u0E14 Mobile Sync", run: () => stop() });
  }
  items.push({
    label: hasRelay ? "$(globe) \u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D VPS" : "$(globe) \u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E1C\u0E48\u0E32\u0E19 VPS (\u0E27\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E08\u0E32\u0E01 VPS)",
    run: () => connectRelay(context)
  });
  if (hasRelay) items.push({ label: "$(close) \u0E40\u0E25\u0E34\u0E01\u0E43\u0E0A\u0E49 VPS", run: () => disconnectRelay(context) });
  items.push({ label: "$(key) \u0E2A\u0E23\u0E49\u0E32\u0E07\u0E23\u0E2B\u0E31\u0E2A\u0E25\u0E31\u0E1A\u0E43\u0E2B\u0E21\u0E48 (\u0E25\u0E34\u0E07\u0E01\u0E4C/QR \u0E40\u0E01\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49)", run: () => vscode.commands.executeCommand("mobileSync.resetToken") });
  const pick = await vscode.window.showQuickPick(items, { title: "Mobile Sync", placeHolder: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07" });
  if (pick) await pick.run();
}
function activate(context) {
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusItem);
  updateStatus();
  context.subscriptions.push(
    vscode.commands.registerCommand("mobileSync.start", () => start(context)),
    vscode.commands.registerCommand("mobileSync.stop", () => stop()),
    vscode.commands.registerCommand("mobileSync.showLink", () => showLink()),
    vscode.commands.registerCommand("mobileSync.menu", () => menu(context)),
    vscode.commands.registerCommand("mobileSync.connectRelay", () => connectRelay(context)),
    vscode.commands.registerCommand("mobileSync.disconnectRelay", () => disconnectRelay(context)),
    vscode.commands.registerCommand("mobileSync.resetToken", async () => {
      const wasRunning = server && server.listening;
      if (wasRunning) await stop();
      await getToken(context, true);
      vscode.window.showInformationMessage("Mobile Sync: \u0E2A\u0E23\u0E49\u0E32\u0E07\u0E23\u0E2B\u0E31\u0E2A\u0E43\u0E2B\u0E21\u0E48\u0E41\u0E25\u0E49\u0E27 \u0E25\u0E34\u0E07\u0E01\u0E4C/QR \u0E40\u0E14\u0E34\u0E21\u0E43\u0E0A\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2D\u0E35\u0E01");
      if (wasRunning) await start(context);
    }),
    { dispose: () => (relay && relay.stop(), server && server.close()) }
  );
  if (vscode.workspace.getConfiguration("mobileSync").get("autoStart", false)) {
    start(context);
  }
}
function deactivate() {
  if (relay) relay.stop();
  if (server) return server.close();
}
module.exports = { activate, deactivate };
