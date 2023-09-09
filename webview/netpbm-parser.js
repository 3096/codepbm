// from https://github.com/RobSis/netpbm-parser
// no license specified. if I get sued, I'll rewrite my own

var NetPBM = (function () {
  "use strict";

  var NetPBMImage = function (contents) {
    var exp = /^(\S+)\s+(\#.*?\n)*\s*(\d+)\s+(\d+)\s+(\d+)?\s*/,
      match = contents.match(exp);

    if (match) {
      var width = (this.width = parseInt(match[3], 10)),
        height = (this.height = parseInt(match[4], 10)),
        maxVal = parseInt(match[5], 10),
        bytes = maxVal < 256 ? 1 : 2,
        data = contents.substr(match[0].length),
        type = (this.type = match[1]);

      switch (match[1]) {
        case "P1":
          this._parser = new ASCIIParser(maxVal + " " + data, bytes);
          this._formatter = new PBMFormatter(width, height);
          break;

        case "P2":
          this._parser = new ASCIIParser(data, bytes);
          this._formatter = new PGMFormatter(width, height, maxVal);
          break;

        case "P3":
          this._parser = new ASCIIParser(data, bytes);
          this._formatter = new PPMFormatter(width, height, maxVal);
          break;

        case "P4":
          this._parser = new BinaryParser(data, bytes);
          this._formatter = new PBMFormatter(width, height);
          break;

        case "P5":
          this._parser = new BinaryParser(data, bytes);
          this._formatter = new PGMFormatter(width, height, maxVal);
          break;

        case "P6":
          this._parser = new BinaryParser(data, bytes);
          this._formatter = new PPMFormatter(width, height, maxVal);
          break;

        default:
          throw new TypeError("Sorry, your file format is not supported. [" + match[1] + "]");
      }
    } else {
      throw new TypeError("Sorry, file does not appear to be a Netpbm file.");
    }
  };

  NetPBMImage.prototype.getCanvas = function () {
    return this._formatter.getCanvas(this._parser);
  };

  var BinaryParser = function (data, bytes) {
    this._data = data;
    this._bytes = bytes;
    this._pointer = 0;
  };

  BinaryParser.prototype.getNextSample = function () {
    if (this._pointer >= this._data.length) return false;

    var val = 0;
    for (var i = 0; i < this._bytes; i++) {
      val = val * 255 + this._data.charCodeAt(this._pointer++);
    }

    return val;
  };

  var ASCIIParser = function (data, bytes) {
    this._data = data.split(/\s+/);
    this._bytes = bytes;
    this._pointer = 0;
  };

  ASCIIParser.prototype.getNextSample = function () {
    if (this._pointer >= this._data.length) return false;

    var val = 0;
    for (var i = 0; i < this._bytes; i++) {
      val = val * 255 + parseInt(this._data[this._pointer++], 10);
    }

    return val;
  };

  var PPMFormatter = function (width, height, maxVal) {
    this._width = width;
    this._height = height;
    this._maxVal = maxVal;
  };

  PPMFormatter.prototype.getCanvas = function (parser) {
    var canvas = document.createElement("canvas"),
      ctx = canvas.getContext("2d"),
      img;

    canvas.width = ctx.width = this._width;
    canvas.height = ctx.height = this._height;

    img = ctx.getImageData(0, 0, this._width, this._height);
    for (var row = 0; row < this._height; row++) {
      for (var col = 0; col < this._width; col++) {
        var factor = 255 / this._maxVal,
          r = factor * parser.getNextSample(),
          g = factor * parser.getNextSample(),
          b = factor * parser.getNextSample(),
          pos = (row * this._width + col) * 4;

        img.data[pos] = r;
        img.data[pos + 1] = g;
        img.data[pos + 2] = b;
        img.data[pos + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
    return canvas;
  };

  var PGMFormatter = function (width, height, maxVal) {
    this._width = width;
    this._height = height;
    this._maxVal = maxVal;
  };

  PGMFormatter.prototype.getCanvas = function (parser) {
    var canvas = document.createElement("canvas"),
      ctx = canvas.getContext("2d"),
      img;

    canvas.width = ctx.width = this._width;
    canvas.height = ctx.height = this._height;

    img = ctx.getImageData(0, 0, this._width, this._height);

    for (var row = 0; row < this._height; row++) {
      for (var col = 0; col < this._width; col++) {
        var d = parser.getNextSample() * (255 / this._maxVal),
          pos = (row * this._width + col) * 4;

        img.data[pos] = d;
        img.data[pos + 1] = d;
        img.data[pos + 2] = d;
        img.data[pos + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
    return canvas;
  };

  var PBMFormatter = function (width, height) {
    this._width = width;
    this._height = height;
  };

  PBMFormatter.prototype.getCanvas = function (parser) {
    var canvas = document.createElement("canvas"),
      ctx = canvas.getContext("2d"),
      img;

    if (parser instanceof BinaryParser) {
      var data = "",
        byte,
        bytesPerLine = Math.ceil(this._width / 8);

      for (var i = 0; i < this._height; i++) {
        var line = parser._data.substr(i * bytesPerLine, bytesPerLine),
          lineData = "";

        for (var j = 0; j < line.length; j++) lineData += ("0000000" + line.charCodeAt(j).toString(2)).substr(-8);
        data += lineData.substr(0, this._width);
      }

      while ((byte = parser.getNextSample()) !== false) {
        data += ("0000000" + byte.toString(2)).substr(-8);
      }

      parser = new ASCIIParser(data.split("").join(" "), 1);
    }

    canvas.width = ctx.width = this._width;
    canvas.height = ctx.height = this._height;

    img = ctx.getImageData(0, 0, this._width, this._height);

    for (var row = 0; row < this._height; row++) {
      for (var col = 0; col < this._width; col++) {
        var d = (1 - parser.getNextSample()) * 255,
          pos = (row * this._width + col) * 4;
        img.data[pos] = d;
        img.data[pos + 1] = d;
        img.data[pos + 2] = d;
        img.data[pos + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
    return canvas;
  };

  // API
  return {
    load: function (data) {
      return new NetPBMImage(data);
    },
  };
})();
