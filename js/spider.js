(function (global) {

    var CardStatus = {
        faceDown: 0,
        faceUp: 1,
        selected: 2
    };


    function SolitareSpider(canvasId) {
        this.bottomCardDecks = [];
        this.topCardDecks = [];
        this.completedDecks = [];

        this.canvas = document.getElementById(canvasId);
        this.table = null;

        this.gameState = [];
    }

    SolitareSpider.prototype.init = function () {
        this.bindEvents();
        this.newGame();
    };

    SolitareSpider.prototype.newGame = function () {
        var shuffledDeck = createCardsDecks(2, parseInt(document.querySelector("#selectLvl").value), true);

        this.setTopDecks(shuffledDeck);
        this.setBottomDecks(shuffledDeck);
        this.completedDecks = [];

        this.gameState = [];
        this.saveState();

        this.table = new SpiderTable(this.canvas, this.topCardDecks, this.bottomCardDecks, this.completedDecks);
        this.table.redraw();
    };

    SolitareSpider.prototype.setBottomDecks = function (shuffledCardsDeck) {
        for (var i = 0; i < 10; i++) {
            this.bottomCardDecks[i] = new CardDeck();

            var deckSize = i > 3 ? 5 : 6;
            for (var j = 0; j < deckSize; j++)
                this.bottomCardDecks[i].push(shuffledCardsDeck.pop())

            this.bottomCardDecks[i].topCard().status = CardStatus.faceUp;
        }
    };

    SolitareSpider.prototype.setTopDecks = function (shuffledCardsDeck) {
        //Create 5 decks of cards
        for (var i = 0; i < 5; i++) {
            this.topCardDecks[i] = [];
            for (var j = 0; j < 10; j++)
                this.topCardDecks[i].push(shuffledCardsDeck.pop());
        }
    };

    SolitareSpider.prototype.topDecksClicked = function () {
        //testing if there is no empty column
        for (i = 0; i < 10; i++)
            if (this.bottomCardDecks[i].length == 0)
                return;

        this.saveState();
        var topDeck = this.topCardDecks.pop();
        for (var i = 0; i < 10; i++) {
            var c = topDeck.pop();
            c.status = CardStatus.faceUp;
            this.bottomCardDecks[i].push(c);
        }
        this.table.redraw();
    };

    SolitareSpider.prototype.selectBottomDeckCard = function (deck, cardIndex) {
        if (deck.checkSequenceBelow(cardIndex)) {
            for (var k = cardIndex; k < deck.length; k++)
                deck[k].status = CardStatus.selected;
            return true
        }
    };

    SolitareSpider.prototype.dropSelectedDeck = function (selectedDeck, selectedCardIndex, targetDeck) {
        this.saveState();

        var selectedCards = selectedDeck.splice(selectedCardIndex, selectedDeck.length - selectedCardIndex);

        //and puts on the target deck
        for (var i = 0; i < selectedCards.length; i++)
            targetDeck.push(selectedCards[i]);

        var completeSequence = targetDeck.getFullSequence();
        if (completeSequence) {
            this.completedDecks.push(completeSequence);
            if (targetDeck.topCard())
                targetDeck.topCard().status = CardStatus.faceUp;

            if (this.checkEndGame()) {
                var endGameAnimation = new EndAnimation(this.table);
                endGameAnimation.start();
            }
        }
        //if there is any card below the selected card's old deck, put it face up
        if (selectedDeck.topCard())
            selectedDeck.topCard().status = CardStatus.faceUp;
    };

    SolitareSpider.prototype.checkEndGame = function () {
        return this.completedDecks.length == 8;
    };

    SolitareSpider.prototype.saveState = function () {
        function cloneDeck(deck) {
            var newDeck = new CardDeck(deck.x, deck.y);
            for (var i = 0; i < deck.length; i++)
                newDeck.push(JSON.parse(JSON.stringify(deck[i])));
            return newDeck;
        }

        var stateBottomDecks = [];
        for (var i = 0; i < this.bottomCardDecks.length; i++)
            stateBottomDecks[i] = cloneDeck(this.bottomCardDecks[i]);

        var stateTopDeck = [];
        for (i = 0; i < this.topCardDecks.length; i++)
            stateTopDeck[i] = cloneDeck(this.topCardDecks[i]);

        var stateCompletedDecks = [];
        for (i = 0; i < this.completedDecks.length; i++)
            stateCompletedDecks[i] = cloneDeck(this.completedDecks[i]);

        this.gameState.push([stateBottomDecks, stateTopDeck, stateCompletedDecks]);
    };

    SolitareSpider.prototype.undo = function () {
        if (this.gameState.length > 0) {
            var loadState = this.gameState.pop();
            this.bottomCardDecks = loadState[0];
            this.topCardDecks = loadState[1];
            this.completedDecks = loadState[2];
            this.table.update(this.topCardDecks, this.bottomCardDecks, this.completedDecks);
        }
    };

    SolitareSpider.prototype.bindEvents = function () {
        var self = this;
        this.canvas.addEventListener('mousedown', function (ev) {
            self.table.mouse_down(ev, self);
        });
        this.canvas.addEventListener('mousemove', function (ev) {
            self.table.mouse_move(ev, self);
        });
        this.canvas.addEventListener('mouseup', function (ev) {
            self.table.mouse_up(ev, self);
        });
        this.canvas.addEventListener('mouseleave', function (ev) {
            self.table.mouse_up(ev, self);
        });

        document.getElementById('btNewGame').onclick = function () {
            self.newGame();
        };

        document.getElementById('btUndo').onclick = function () {
            self.undo();
        };
    };


    function SpiderTable(canvas, topCardDecks, bottomCardDecks, completedDecks) {
        this.canvas = canvas;
        this.context = this.canvas.getContext('2d');

        this.topCardDecks = topCardDecks;
        this.bottomCardDecks = bottomCardDecks;
        this.completedDecks = completedDecks;

        this.faceDownImage = new Image();
        this.faceDownImage.src = 'media/cards/back.png';
        this.suits = ['spades', 'hearts', 'clubs', 'diamonds'];
        this.cardsImages = [];

        this.selectedCardIndex = 0;
        this.selectedDeck = 0;

        // EVENT HANDLING
        this.startMousePos = {};
        this.dragging = false;

        this.cardWidth = 0;
        this.cardHeight = 0;


        this.loadImages();
    }

    SpiderTable.prototype.redraw = function () {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        var posx = this.cardWidth * 0.05;
        //draw top decks
        for (var i = 0; i < this.topCardDecks.length; i++) {
            this.topCardDecks[i].x = posx;
            this.topCardDecks[i].y = 0;
            this.drawCardAt(this.topCardDecks[0][0], posx, 0);
            posx += this.cardWidth * 0.3;
        }

        //draw completed decks
        posx = this.canvas.width - this.cardWidth;
        for (i = 0; i < this.completedDecks.length; i++) {
            var completedDeckCard = this.completedDecks[i][0];
            completedDeckCard.x = posx;
            completedDeckCard.y = 0;
            completedDeckCard.status = CardStatus.faceUp;
            this.drawCard(completedDeckCard);
            posx -= this.cardWidth * 0.3;
        }

        //draw bottom decks
        posx = this.cardWidth * 0.05;
        for (i = 0; i < this.bottomCardDecks.length; i++) {
            var posy = this.cardHeight + this.cardHeight * 0.05;
            this.bottomCardDecks[i].x = posx;
            for (var j = 0; j < this.bottomCardDecks[i].length; j++) {
                if (this.bottomCardDecks[i][j - 1] && this.bottomCardDecks[i][j - 1].status != CardStatus.faceDown) {
                    posy += this.cardHeight * 0.09;
                }
                var bottomDeckCard = this.bottomCardDecks[i][j];
                bottomDeckCard.x = posx;
                bottomDeckCard.y = posy;
                if (bottomDeckCard.status != CardStatus.selected)
                    this.drawCard(bottomDeckCard);
                posy += this.cardHeight * 0.09;
            }
            posx += this.cardWidth + this.cardWidth * 0.1;
        }
    };

    SpiderTable.prototype.loadImages = function () {
        this.cardWidth = this.canvas.width / 11;
        this.cardHeight = this.cardWidth * 1.52;

        var self = this;
        for (var i = 0; i < 4; i++) {
            this.cardsImages[i] = [];

            for (var j = 1; j < 14; j++) {
                this.cardsImages[i][j] = new Image();
                this.cardsImages[i][j].src = 'media/cards/' + j + this.suits[i] + '.png';
                this.cardsImages[i][j].onload = function () {
                    self.redraw();
                }
            }
        }
    };

    SpiderTable.prototype.drawMove = function (card, dx, dy) {
        this.drawCardAt(card, card.x - dx, card.y - dy);
    };

    SpiderTable.prototype.drawCard = function (card) {
        this.drawCardAt(card, card.x, card.y)
    };

    SpiderTable.prototype.drawCardAt = function (card, x, y) {
        var cardImage = card.status == CardStatus.faceDown ? this.faceDownImage : this.cardsImages[card.suit][card.number];
        this.context.drawImage(cardImage, x, y, this.cardWidth, this.cardHeight);
    };

    SpiderTable.prototype.mouse_down = function (ev, spiderGame) {
        if (this.dragging)
            return;
        var mousePos = this.getMousePos(ev);

        //testing if clicked on the extra top decks
        if (this.isTopDeckClicked(mousePos.x, mousePos.y))
            spiderGame.topDecksClicked();
        else {
            var bottomDeckClicked = this.getBottomDeckCardAt(mousePos.x, mousePos.y);
            if (bottomDeckClicked) {
                if (spiderGame.selectBottomDeckCard(bottomDeckClicked[0], bottomDeckClicked[1])) {
                    this.selectedDeck = bottomDeckClicked[0];
                    this.selectedCardIndex = bottomDeckClicked[1];
                    this.dragging = true;
                    this.startMousePos = mousePos;
                }
            }
        }
    };

    SpiderTable.prototype.mouse_move = function (ev) {
        if (this.dragging && this.selectedDeck) {
            this.redraw();
            var mousePos = this.getMousePos(ev);
            var dx = this.startMousePos.x - mousePos.x;
            var dy = this.startMousePos.y - mousePos.y;
            for (var i = this.selectedCardIndex; i < this.selectedDeck.length; i++)
                this.drawMove(this.selectedDeck[i], dx, dy);
        }
    };

    SpiderTable.prototype.mouse_up = function (ev, spiderGame) {
        if (this.dragging) {
            for (var j = this.selectedCardIndex; j < this.selectedDeck.length; j++)
                this.selectedDeck[j].status = CardStatus.faceUp;

            var dx = this.startMousePos.x - this.getMousePos(ev).x;

            var xTarget = this.selectedDeck[this.selectedCardIndex].x - dx + this.cardWidth / 2;
            var targetDeck = this.getBottomDeckAt(xTarget);

            if (targetDeck && targetDeck.canMoveToHere(this.selectedDeck[this.selectedCardIndex]))
                spiderGame.dropSelectedDeck(this.selectedDeck, this.selectedCardIndex, targetDeck);

            this.selectedDeck = null;
            this.selectedCardIndex = null;
            this.redraw();
        }
        this.dragging = false;
    };

    SpiderTable.prototype.getMousePos = function (ev) {
        var rect = this.canvas.getBoundingClientRect();
        return {
            x: (ev.clientX - rect.left) / (rect.right - rect.left) * this.canvas.width,
            y: (ev.clientY - rect.top) / (rect.bottom - rect.top) * this.canvas.height
        }
    };

    SpiderTable.prototype.isTopDeckClicked = function (px, py) {
        return py <= this.cardHeight && this.topCardDecks[0] && px <= (this.topCardDecks[this.topCardDecks.length - 1].x + this.cardWidth)
    };

    SpiderTable.prototype.getBottomDeckAt = function (px) {
        for (var i = 0; i < 10; i++)
            if (px >= this.bottomCardDecks[i].x && px <= this.bottomCardDecks[i].x + this.cardWidth)
                return this.bottomCardDecks[i]
    };

    SpiderTable.prototype.getBottomDeckCardAt = function (px, py) {
        var bottomDeck = this.getBottomDeckAt(px);
        if (bottomDeck && bottomDeck.length > 0)
            for (var i = bottomDeck.length - 1; i >= 0; i--)
                if (this.isCardClicked(bottomDeck[i], py) && bottomDeck[i].status == CardStatus.faceUp)
                    return [bottomDeck, i];
    };

    SpiderTable.prototype.isCardClicked = function (card, py) {
        return py >= card.y && py <= card.y + this.cardHeight
    };

    SpiderTable.prototype.update = function (topCardDecks, bottomCardDecks, completedDecks) {
        this.topCardDecks = topCardDecks;
        this.bottomCardDecks = bottomCardDecks;
        this.completedDecks = completedDecks;
        this.redraw();
    };


    function createCardsDecks(numDecks, numNipes, doShuffle) {
        var orderedDeck = [];
        var suit = -1;
        for (var i = 0; i < 4 * numDecks; i++) {

            if (i % (4 * numDecks / numNipes) == 0) {
                suit++;
            }

            for (var j = 1; j < 14; j++) {
                orderedDeck.push(new Card(suit, j));
            }
        }

        var finalDeck = orderedDeck;

        if (doShuffle) {
            var randomDeck = [];
            while (orderedDeck.length > 0) {
                var pos = Math.floor(Math.random() * orderedDeck.length);
                randomDeck.push(orderedDeck.splice(pos, 1)[0]);
            }
            finalDeck = randomDeck;
        }

        return finalDeck;
    }


    function CardDeck(x, y) {
        this.x = x;
        this.y = y;
    }

    CardDeck.prototype = new Array;

    CardDeck.prototype.checkSequenceBelow = function (cardIndex) {
        var isSequence = true;
        for (var k = cardIndex + 1; k < this.length; k++)
            if (!(this[k].suit == this[k - 1].suit) || !(this[k].number == this[k - 1].number - 1)) {
                isSequence = false;
                break;
            }
        return isSequence;
    };

    CardDeck.prototype.topCard = function () {
        return this.length ? this[this.length - 1] : null;
    };

    CardDeck.prototype.getFullSequence = function () {
        if (this.length >= 13 && this[this.length - 13].status == CardStatus.faceUp) {
            var pos = this.length - 1;
            for (var k = pos; k > pos - 12; k--)
                if (!(this[k].suit == this[k - 1].suit) || !(this[k].number == this[k - 1].number - 1))
                    return false;
            return this.splice(this.length - 13, 13);
        }
        return false;
    };

    CardDeck.prototype.canMoveToHere = function (card) {
        return this.length == 0 || card.number == this.topCard().number - 1
    };


    function Card(_suit, _number) {
        this.suit = _suit;
        this.number = _number;
        this.status = CardStatus.faceDown;
        this.x = 0;
        this.y = 0;
    }


    function EndAnimation(table) {
        this.animating = 0;

        this.tInterval = 30;
        this.currentDeckIndex = null;
        this.currentCardIndex = 0;
        this.table = table;
        this._aY = 4;
        this.done = false;

        this.start = function () {
            this.currentDeckIndex = table.completedDecks.length - 1;
            this.currentCardIndex = 0;
            this.startAnimateCard(table.completedDecks[this.currentDeckIndex][this.currentCardIndex]);

            var self = this;
            window.onkeypress = function (e) {
                var code = e.keyCode ? e.keyCode : e.which;
                if (String.fromCharCode(code).toLowerCase() == "n")
                    self.next();
            }
        };

        this.startAnimateCard = function (card) {
            card.status = CardStatus.faceUp;
            var startStatus = {
                curX: this.table.canvas.width - this.table.cardWidth - ((this.table.cardWidth * 0.3) * (this.currentDeckIndex)),
                curY: 0,
                vX: 6 + parseInt(Math.random() * 6),
                vY: -(10 + parseInt(Math.random() * 10)),
                k: 0.65 + Math.random() * 0.25
            };
            this.animating++;
            this.animateCurrentCard(card, startStatus);
        };

        this.animateCurrentCard = function (card, status) {
            this.table.drawCardAt(card, status.curX, status.curY);

            status.curX = status.curX - status.vX;
            status.vY = status.vY + this._aY;
            status.curY = status.curY + status.vY;
            if ((status.curY + this.table.cardHeight) > this.table.canvas.height) {
                status.curY = this.table.canvas.height - this.table.cardHeight;
                status.vY = -(status.vY * status.k);
            }
            if ((status.curX + this.table.cardWidth) < 0) {
                if (--this.animating == 0)
                    this.next();
            } else {
                var self = this;
                setTimeout(function () {
                    self.animateCurrentCard(card, status)
                }, self.tInterval);
            }
        };

        this.next = function () {
            if (this.done)
                return;
            if (++this.currentCardIndex < table.completedDecks[this.currentDeckIndex].length)
                this.startAnimateCard(table.completedDecks[this.currentDeckIndex][this.currentCardIndex]);
            else if (--this.currentDeckIndex >= 0) {
                this.currentCardIndex = 0;
                this.startAnimateCard(table.completedDecks[this.currentDeckIndex][this.currentCardIndex]);
            } else
                this.done = true
        };
    }

    global.SolitareSpider = SolitareSpider;
}(window));

window.onload = function () {
    (new SolitareSpider('spiderCanvas')).init()
};
