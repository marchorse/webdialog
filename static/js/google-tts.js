$(document).ready(function () {
    var tts = {
        lang: 'en',
        init: function () {
            this.initPlayer();
        },
	playing :false,
        speak: function (text) {
            this.text = new Array();
            var words = text.split(' ');
            var this_chunk = "";
            for (var i = 0; i < words.length; i++) {
		var this_word = words[i];
		if (this_word.length > 100) {
			this_word = this_word.substr(0,100);
		}
		
		if (this_word.length + this_chunk.length < 90) {
			this_chunk += " " + this_word;
		} else {
			this.text.push(this_chunk);
			this_chunk = this_word;
		}
		
		var last_char = this_word.substr(this_word.length-1);
                if (last_char == "." || last_char == "?" || last_char == "!") {
                    this.text.push(this_chunk);
		    this_chunk = "";
                }
            }
	    if (this_chunk != "") {
		this.text.push(this_chunk);
	    }
            this.play_i = 0;
            this.play_n = this.text.length;
		this.playing = true;
            this.playNext();
        },
        playNext: function () {
            var url = this.getUrl(this.text[this.play_i], this.lang);
            this.play(url);
            this.play_i++;
        },
        getUrl: function (text, lang) {
            if (!lang) lang = tts.lang;
            return 'http://translate.google.com/translate_tts?tl=%lang&q=%text'.replace('%lang', lang).replace('%text', encodeURI(text));
        },

        initPlayer: function () {
            this.player = $('body').append('<audio id="tts-player" controls="controls"><source src="" type="audio/mp3" /></audio>').find('#tts-player').css({
                visibility: 'hidden',
                position: 'fixed',
                top: 0,
                left: 0
            });
            var self = this;
            this.player.bind('ended', function () {
                if (self.play_i < self.play_n) {
                    self.playNext();
                } else {
			self.playing = false;
			self.onfinished();
                }
            });
        },
        play: function (url) {
            this.player.find("source").attr('src', url);
            this.player[0].pause();
            this.player[0].load();
            this.player[0].play();
        }
	,
	onfinished : function () {
		console.log("tts finished");
	}
    };
    tts.init();
    window.tts = tts;
    
  });