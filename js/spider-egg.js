(function () {
    function SpiderEasterEgg() {
        var spiderSrc = '//joaoricardo000.github.io/spider-easter-egg/spider.html';
        this.template = '<div id="spiderEggHeader">Spider<button>X</button></div><iframe id="spiderEggIframe" src="' + spiderSrc + '" frameBorder="0" scrolling="no"></iframe>';
        this.css = '#spiderEggDiv { position: absolute; top: 0; left: 0; width: 654px; height: 515px; z-index: 9999999; border: 2px solid #0B3682; background-color: #BFBFBF; } #spiderEggIframe { width: 100%; height: 100%; } #spiderEggHeader { padding-left: 6px; width: 100%; height: 25px; font-weight: bold; font-size: large; color: white; background: #0056e8; /* Old browsers */ background: -moz-linear-gradient(top, #0056e8 0%, #2989d8 100%, #207cca 100%, #0067ff 100%); /* FF3.6-15 */ background: -webkit-linear-gradient(top, #0056e8 0%, #2989d8 100%, #207cca 100%, #0067ff 100%); /* Chrome10-25,Safari5.1-6 */ background: linear-gradient(to bottom, #0056e8 0%, #2989d8 100%, #207cca 100%, #0067ff 100%); /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */ filter: progid:DXImageTransform.Microsoft.gradient(startColorstr="#0056e8", endColorstr="#0067ff", GradientType=0); /* IE6-9 */ } #spiderEggHeader button { height: 25px; float: right; font-size: small; background-color: #E65228; }';

        this.spiderDiv = null;
        this.spiderHeader = null;

        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;

        this.startPosTop = 0;
        this.startPosLeft = 0;
    }

    SpiderEasterEgg.prototype = {
        create: function () {
            if (document.getElementById("spiderEggDiv"))
                return;
            this.spiderDiv = document.createElement("div");
            this.spiderDiv.id = "spiderEggDiv";
            this.spiderDiv.innerHTML = this.template;

            this.spiderDiv.style.top = ((window.innerHeight / 2) - (515 / 2)) + "px";
            this.spiderDiv.style.left = ((window.innerWidth / 2) - (654 / 2)) + "px";

            document.querySelector("body").appendChild(this.spiderDiv);

            var css = document.createElement("style");
            css.innerHTML = this.css;

            document.querySelector("body").appendChild(css);

            this.spiderHeader = document.getElementById("spiderEggHeader");
            this.addListeners();
        },

        addListeners: function () {
            var self = this;

            this.spiderHeader.onmousedown = function (evt) {
                self.startX = evt.clientX;
                self.startY = evt.clientY;

                self.startPosTop = parseInt(self.spiderDiv.style.top);
                self.startPosLeft = parseInt(self.spiderDiv.style.left);

                self.isDragging = true;
            };

            this.spiderHeader.onmousemove = function (evt) {
                if (self.isDragging) {
                    var nTop = self.startPosTop - (self.startY - evt.clientY);
                    var nLeft = self.startPosLeft - (self.startX - evt.clientX);
                    self.spiderDiv.style.top = nTop + "px";
                    self.spiderDiv.style.left = nLeft + "px";
                }
            };

            this.spiderHeader.onmouseup = function () {
                self.isDragging = false;
            };

            document.querySelector("#spiderEggHeader button").onclick = function () {
                document.querySelector("body").removeChild(self.spiderDiv);
            }
        }
    };

    var keys = document.getElementById("spiderEggJs").getAttribute("data-keys").toLowerCase();
    var keyIndex = 0;

    window.onkeydown = function (e) {
        var code = e.keyCode ? e.keyCode : e.which;
        var key = String.fromCharCode(code).toLowerCase();
        if (keys[keyIndex] == key) {
            if (++keyIndex == keys.length) {
                (new SpiderEasterEgg()).create();
                keyIndex = 0;
            }
        } else
            keyIndex = 0;
    }

}());