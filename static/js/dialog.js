var got_error = false;
var in_dialog = false;
var utterance_key = 0;

$(document).ready(function () {
    // check browser
    if (!('webkitSpeechRecognition' in window)) {
        window.location.replace("/static/incompatible-browser.html");
    } 
    
    // dialog object, which we can attach event listeners to
        window.dialog = $('body').append('<div id="dialog"></div>').find('#dialog').css({
                visibility: 'hidden',
                position: 'fixed',
                top: 0,
                left: 0
            });
    
    // set up recorder, then recogniser
      
    window.audio_context = new webkitAudioContext();
    navigator.webkitGetUserMedia({audio: true},
        function(stream) {
            var input = window.audio_context.createMediaStreamSource(stream);
            window.recorder = new Recorder(input);
            setupRecogniser();
        },
        function(e) {
            window.dialog.trigger("error", ["Unable to get access to microphone."]);
        });
    
    $(window).unload(function() {
        if (in_dialog) {
            stopDialog();
        }
    }); 

});


function startDialog() {
    if (window.initial_prompt != "") {
        window.tts.speak(window.initial_prompt);
        window.dialog.trigger("tts_start", [window.initial_prompt]);
        window.tts.onfinished = function() {
            startListening();
            window.dialog.trigger("tts_end");
        };
    }
    in_dialog = true;
    window.dialog.trigger("dialog_started");
    utterance_key = 0;
}

function stopDialog() {
    in_dialog = false;
    stopRecording(false);
    window.recognition.stop();
    window.dialog.trigger("dialog_ended");
    $.ajax({
                type: "POST",
                url: "/dialog/end",
                async: false, // forces browser to send this even if it's closing
            });
}

function startListening() {
    if (!in_dialog) {
        return;
    }
    window.recognition.start();
    got_error = false;
    window.last_start_timestamp = event.timeStamp;
    startRecording();
    window.dialog.trigger("listening");
}

function setupRecogniser() {
    

    
    // set up recogniser
    window.recognition = new webkitSpeechRecognition();
    window.recognition.continuous = true;
    window.recognition.interimResults = true;
    window.recognition.maxAlternatives = 10;
    window.recognition.lang = "en_uk";

    window.recognition.onstart = function () {
        window.recognizing = true;
    };

    window.recognition.onerror = function (event) {
        got_error = true;
        var error_description = "";
        if (event.error == 'no-speech') {
            error_description = "No speech was detected.";
        }
        if (event.error == 'audio-capture') {
            error_description = "No attached microphone detected.";
        }
        if (event.error == 'not-allowed') {
            if (event.timeStamp - window.last_start_timestamp < 100) {
                error_description = "Access to the microphone was blocked.";
            } else {
                error_description = "Access to the microphone was denied.";
            }
        }
        window.dialog.trigger("error", [error_description]);
    };

    window.recognition.onend = function () {
        window.recognizing = false;
        window.dialog.trigger("not_listening");
        if (in_dialog && !window.tts.playing) {
            startListening();
        }
    };

    window.recognition.onresult = function (event) {

        if (event.results[event.results.length - 1].isFinal) {
            hypList = new Array();
            for (var j = 0; j < event.results.length; j++) {
                var result = event.results[j];
                var theseHyps = {
                    "hyps": new Array()
                };
                for (var i = 0; i < result.length; i++) {
                    if (i == 0) {
                        theseHyps.confidence = result[i].confidence;
                    }
                    theseHyps["hyps"].push(result[i].transcript);
                }
                hypList.push(theseHyps);
            }
            event.hypList = hypList;
            event.utterance_key = utterance_key;
            utterance_key++;
            stopRecording(true);
            $.ajax({
                type: "POST",
                url: "/dialog/asr_result",
                data: JSON.stringify(event),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function (response) {            
                    window.dialog.trigger("response", [response]);
                    window.recognition.stop();
            
                },
                error: function (response) {
                    window.dialog.trigger("error", "Unable to send speech to server.");
                }
            });
        }


        window.dialog.trigger("asr_result", [event]);
    };
    window.dialog.on("response", function(e, response) {
       // deal with TTS
        // we want to stop recognising while the system is talking
        // and start listening once the tts has ended
        if (response.hasOwnProperty('tts')) {
            
            console.log(response.tts);
            window.tts.speak(response.tts);
            window.dialog.trigger("tts_start", [response.tts]);
            window.tts.onfinished = function() {
                startListening();
                window.dialog.trigger("tts_end");
            };
        }
        // deal with the system ending the dialog:
        if (response.hasOwnProperty('ended') && response.ended) {
            setTimeout(stopDialog, 1000); // stop the dialog in a second,
                                        //gives a chance for the recording of the last utterance to be sent
        }
    });

}

function startRecording() {
    window.recorder.record();
}
function stopRecording(sendtoserver) {
    window.recorder.stop();
    if (!sendtoserver) {
        return;
    }
    window.recorder.exportWAV(function(blob) {
      console.log(blob);
      recorder.exportWAV(function(s) {
            var fd = new FormData();
            fd.append('data', blob);
            fd.append('csrf_token', window.csrf_token);
            fd.append('utterance_key', utterance_key-1);
            $.ajax({
                type: 'POST',
                url: '/dialog/recording',
                data: fd,
                processData: false,
                contentType: false,
                error: function (response) {
                    window.dialog.trigger("error", "Unable to send recording to server.");
                },
                success:function (response) {
                    // pass
                    window.csrf_token = response.csrf_token;
                }
            });
            window.recorder.clear();
        });
    });
}