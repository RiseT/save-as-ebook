var allImages = [];
var extractedImages = [];
var maxNrOfElements = 20000;
var allowedTags = [
    'address', 'article', 'aside', 'footer', 'header', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'hgroup', 'nav', 'section', 'dd', 'div', 'dl', 'dt', 'figcaption', 'figure', 'hr', 'li',
    'main', 'ol', 'p', 'pre', 'ul', 'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data',
    'dfn', 'em', 'i', 'img', 'kbd', 'mark', 'q', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'small', 'span',
    'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'del', 'ins', 'caption', 'col', 'colgroup',
    'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr',
    'math', 'maction', 'menclose', 'merror', 'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot',
    'mrow', 'ms', 'mspace', 'msqrt', 'mstyle', 'msub', 'msup', 'msubsup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover', 'msgroup', 'mlongdiv', 'mscarries',
    'mscarry', 'mstack'
];
var cssClassesToTmpIds = {};
var tmpIdsToNewCss = {};

//////

function getImageSrc(srcTxt) {
    if (!srcTxt) {
        return '';
    }
    srcTxt = srcTxt.trim();
    if (srcTxt === '') {
        return '';
    }
    var isB64Img = isBase64Img(srcTxt);
    var fileExtension = getFileExtension(srcTxt);
    var newImgFileName = 'img-' + (Math.floor(Math.random()*1000000*Math.random()*100000)) + '.' + fileExtension;

    if (isB64Img) {
        extractedImages.push({
            filename: newImgFileName, // TODO name
            data: getBase64ImgData(srcTxt)
        });
    } else {
        allImages.push({
            originalUrl: getImgDownloadUrl(srcTxt),
            filename: newImgFileName,  // TODO name
        });
    }

    return '../images/' + newImgFileName;
}

function formatPreCodeElements($jQueryElement) {
    $jQueryElement.find('pre').each(function (i, pre) {
        $(pre).replaceWith('<pre>' + pre.innerText + '</pre>');
    });
    $jQueryElement.find('code').each(function (i, pre) {
        $(pre).replaceWith('<code>' + pre.innerText + '</code>');
    });
}

function extractMathMl($htmlObject) {
    $htmlObject.find('span[id^="MathJax-Element-"]').each(function (i, el) {
        $(el).replaceWith('<span>' + el.getAttribute('data-mathml') + '</span>');
    });
}

function extractCanvasToImg($htmlObject) {
    $htmlObject.find('canvas').each(function (index, elem) {
        var tmpXP = getXPath(elem);
        tmpXP = tmpXP.replace(/^\/div\[1\]/m, '/html[1]/body[1]');
        var docEl = lookupElementByXPath(tmpXP);
        var jpegUrl = docEl.toDataURL('image/png');
        $(elem).replaceWith('<img src="' + jpegUrl + '" alt=""></img>');
    });
}

function extractSvgToImg($htmlObject) {
    var serializer = new XMLSerializer();
    $htmlObject.find('svg').each(function (index, elem) {
        var svgXml = serializer.serializeToString(elem);
        var imgSrc = 'data:image/svg+xml;base64,' + window.btoa(svgXml);
        $(elem).replaceWith('<img src="' + imgSrc + '">' + '</img>');
    });
}

function preProcess($htmlObject) {
    extractMathMl($htmlObject);
    extractCanvasToImg($htmlObject);
    extractSvgToImg($htmlObject);
    $htmlObject.find('script, style, noscript, iframe').remove();
    $htmlObject.find('*:empty').not('img').remove();
    formatPreCodeElements($htmlObject);
}

function force($content, withError) {
    try {
        var tagOpen = '@@@' + generateRandomTag();
        var tagClose = '###' + generateRandomTag();
        var startEl = '<object>';
        var endEl = '</object>';

        if (withError) {
            $content = $($content);
            preProcess($content);
        }

        $content.find('img').each(function (index, elem) {
            var imgSrc = getImageSrc($(elem).attr('src'));
            if (imgSrc === '') {
                $(elem).replaceWith('');
            } else {
                $(elem).replaceWith(startEl + tagOpen + 'img src="' + imgSrc + '"' + tagClose + tagOpen + '/img' + tagClose + endEl);
            }
        });

        $content.find('a').each(function (index, elem) {
            var aHref = getHref($(elem).attr('href'));
            if (aHref === '') {
                $(elem).replaceWith('');
            } else {
                $(elem).replaceWith(startEl + tagOpen + 'a href="' + aHref + '"' + tagClose + $(elem).html() + tagOpen + '/a' + tagClose + endEl);
            }
        });

        all($content);

        function all($startElement) {
            var tagName = $startElement.get(0).tagName.toLowerCase();
            if (allowedTags.indexOf(tagName) >= 0) {
                var children = $startElement.children();
                var childrenLen = children.length;
                while (childrenLen--) {
                    all($(children[childrenLen]));
                }
                $startElement.replaceWith(startEl + tagOpen + tagName + tagClose + $startElement.html() + tagOpen + '/' + tagName + tagClose + endEl);
            }
        }

        var contentString = $content.text();

        var tagOpenRegex = new RegExp(tagOpen, 'gi');
        var tagCloseRegex = new RegExp(tagClose, 'gi');
        contentString = contentString.replace(tagOpenRegex, '<');
        contentString = contentString.replace(tagCloseRegex, '>');
        contentString = contentString.replace(/&nbsp;/gi, '&#160;');

        return contentString;
    } catch (e) {
        console.log('Error:', e);
        return '';
    }
}

function sanitize(rawContentString) {
    allImages = [];
    extractedImages = [];
    var srcTxt = '';
    var dirty = null;
    try {
        var wdirty = $.parseHTML(rawContentString);
        $wdirty = $(wdirty);

        preProcess($wdirty);

        if ($('*').length > maxNrOfElements) {
            return force($wdirty, false);
        }

        dirty = '<div>' + $wdirty.html() + '</div>';

        var results = '';
        var lastFragment = '';
        var lastTag = '';

        HTMLParser(dirty, {
            start: function(tag, attrs, unary) {
                lastTag = tag;
                if (allowedTags.indexOf(tag) < 0) {
                    return;
                }

                var tattrs = null;
                if (tag === 'img') {
                    var tmpAttrsTxt = '';
                    for (var i = 0; i < attrs.length; i++) {
                        if (attrs[i].name === 'src') {
                            tmpAttrsTxt += ' src="' + getImageSrc(attrs[i].value) + '"';
                        } else if (attrs[i].name === 'data-class') {
                            tmpAttrsTxt += ' class="' + attrs[i].value + '"';
                        }
                    }
                    lastFragment = tattrs.length === 0 ? '<img></img>' : '<img ' + tmpAttrsTxt + '" alt=""></img>';
                } else if (tag === 'a') {
                    var tmpAttrsTxt = '';
                    for (var i = 0; i < attrs.length; i++) {
                        if (attrs[i].name === 'href') {
                            tmpAttrsTxt += ' href="' + getImageSrc(attrs[i].value) + '"';
                        } else if (attrs[i].name === 'data-class') {
                            tmpAttrsTxt += ' class="' + attrs[i].value + '"';
                        }
                    }
                    lastFragment = tattrs.length === 0 ? '<a>' : '<a href="' + tmpAttrsTxt + '">';
                } else {
                    // TODO ???
                    tattrs = attrs.filter(function(attr) {
                        return attr.name === 'data-class';
                    }).map(function(attr) {
                        return attr.value;
                    });
                    lastFragment = '<' + tag + ' class="' + tattrs[0] + '"' + '>';
                }

                results += lastFragment;
                lastFragment = '';
            },
            end: function(tag) {
                if (allowedTags.indexOf(tag) < 0 || tag === 'img') {
                    return;
                }

                results += "</" + tag + ">\n";
            },
            chars: function(text) {
                if (lastTag !== '' && allowedTags.indexOf(lastTag) < 0) {
                    return;
                }
                results += text;
            },
            comment: function(text) {
                // results += "<!--" + text + "-->";
            }
        });

        results = results.replace(/&nbsp;/gi, '&#160;');

        return results;

    } catch (e) {
        console.log('Error:', e);
        return force(dirty, true);
    }

}

function getContent(htmlContent) {
    try {
        var tmp = document.createElement('div');
        tmp.appendChild(htmlContent.cloneNode(true));
        var dirty = '<div>' + tmp.innerHTML + '</div>';
        return sanitize(dirty);
    } catch (e) {
        console.log('Error:', e);
        return '';
    }
}

/////

function getPageUrl(url) {
    return url.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'') + Math.floor(Math.random() * 10000) + '.xhtml';
}

function getPageTitle(title) {
    if (title.trim().length === 0) {
        return 'ebook';
    }
    return title;
}

function getSelectedNodes() {
    // if (document.selection) {
        // return document.selection.createRange().parentElement();
        // return document.selection.createRange();
    // }
    var selection = window.getSelection();
    var docfrag = [];
    for (var i = 0; i < selection.rangeCount; i++) {
        docfrag.push(selection.getRangeAt(i).cloneContents());
    }
    return docfrag;
}

/////

function jsonToCss(jsonObj) {
    var keys = Object.keys(jsonObj);
    var result = '';
    for (var i = 0; i < keys.length; i++) {
        var tmpJsonObj = jsonObj[keys[i]];
        var tmpKeys = Object.keys(tmpJsonObj);
        result += '.' + keys[i] + ' {';
        for (var j = 0; j < tmpKeys.length; j++) {
            result += tmpKeys[j] + ':' + tmpJsonObj[tmpKeys[j]] + ';';
        }
        result += '} ';
    }
    return result;
}

function extractCss(callback) {
    $('body').find('*').each(function (i, pre) {
        if (!$(pre).is(':visible')) {
            $(pre).replaceWith('');
        } else {
            var classNames = pre.getAttribute('class');
            var tmpName = cssClassesToTmpIds[classNames];
            var tmpNewCss = tmpIdsToNewCss[tmpName];
            if (!tmpName) {
                tmpName = 'class-' + Math.floor(Math.random()*100000);
                cssClassesToTmpIds[classNames] = tmpName;
                tmpIdsToNewCss[tmpName] = {};
            }
            if (!tmpNewCss) {
                var style = window.getComputedStyle(pre);
                tmpNewCss = {};
                tmpNewCss['font-size'] = style['font-size'];
                tmpNewCss['font-weight'] = style['font-weight'];
                tmpNewCss['color'] = style['color'];
                tmpNewCss['background-color'] = style['background-color'];
                tmpIdsToNewCss[tmpName] = tmpNewCss;
            }
            pre.setAttribute('data-class', tmpName);
        }
    });
    getCurrentStyle(function (currentStyle) {
        var styleText = currentStyle.style;
        var json = CSSJSON.toJSON(styleText);
        var keys = Object.keys(json.children);
        for (var i = 0; i < keys.length; i++) {
            if (json.children[keys[i]].children['display'] && json.children[keys[i]].children['display'] === 'none') {
                continue;
            }
            var cEls = document.querySelectorAll(keys[i]);
            for (var j = 0; j < cEls.length; j++) {
                var style = window.getComputedStyle(cEls[j]);
                tmpNewCss = {};
                tmpNewCss['font-size'] = style['font-size'];
                tmpNewCss['font-weight'] = style['font-weight'];
                tmpNewCss['color'] = style['color'];
                tmpNewCss['background-color'] = style['background-color'];
                tmpName = 'class-' + Math.floor(Math.random()*100000);
                tmpIdsToNewCss[tmpName] = tmpNewCss;
                var oldClass = cEls[j].getAttribute('data-class');
                cEls[j].setAttribute('data-class', oldClass + ' ' + tmpName);
            }
        }
        callback(jsonToCss(tmpIdsToNewCss));
    });
}

/////

function deferredAddZip(url, filename) {
    var deferred = $.Deferred();
    JSZipUtils.getBinaryContent(url, function(err, data) {
        if (err) {
            // deferred.reject(err); TODO
            console.log('Error:', err);
            deferred.resolve();
        } else {
            extractedImages.push({
                filename: filename,
                data: base64ArrayBuffer(data)
            });
            deferred.resolve();
        }
    });
    return deferred;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var imgsPromises = [];
    var result = {};
    var pageSrc = '';
    var tmpContent = '';
    // var styleFile =
    extractCss(function (styleFile) {
        if (request.type === 'extract-page') {
            pageSrc = document.getElementsByTagName('body')[0];
            tmpContent = getContent(pageSrc);
        } else if (request.type === 'extract-selection') {
            pageSrc = getSelectedNodes();
            pageSrc.forEach(function (page) {
                tmpContent += getContent(page);
            });
        } else if (request.type === 'echo') {
            sendResponse({
                echo: true
            });
            return;
        }

        if (tmpContent.trim() === '') {
            sendResponse('');
            return;
        }

        allImages.forEach(function (tmpImg) {
            imgsPromises.push(deferredAddZip(tmpImg.originalUrl, tmpImg.filename));
        });

        $.when.apply($, imgsPromises).done(function() {
            var tmpTitle = getPageTitle(document.title);
            result = {
                url: getPageUrl(tmpTitle),
                title: tmpTitle,
                baseUrl: getCurrentUrl(),
                styleFileContent: styleFile,
                styleFileName: 'style'+Math.floor(Math.random()*100000)+'.css',
                images: extractedImages,
                content: tmpContent
            };
            sendResponse(result);
        }).fail(function(e) {
            console.log('Error:', e);
        });
    });

    return true;
});
