/* Some example views for visualising the dialog */
$(document).ready(function() {
    
    // Start and Stop button
    var start_text = "Start";
    var stop_text  = "Stop";
    $start_button = $("#start_button");
    $start_button.text(start_text);
    $start_button.click(function (event) {
        if (in_dialog) {
            stopDialog();
        } else {
            startDialog();
        }
    });
    window.dialog.on("dialog_ended", function(e) {
        $start_button.text(start_text);
        $(this).removeClass("in_dialog");
    });
    window.dialog.on("dialog_started", function(e) {
        $start_button.text(stop_text);
        $(this).addClass("in_dialog");
    });
    
    // Live ASR Results (not used by default, but this is useful code)
    if ($('#results').length != 0) {
        window.dialog.on("asr_result", function(event, asr_result){
            $results = $("#results");
            $results.empty();
                var j;
                for (var i = 0; i < asr_result.results.length; i++) {
                    j = asr_result.results.length - i - 1;
                    $results.append(resultView(asr_result.results[j], j));
                } 
        });
    }
    function resultView(result, index) {
        var div = document.createElement('div');
        div.className = "resultView";
        div.id = "turn_" + index;
        var tophyp = document.createElement('p');
        tophyp.className = "topHyp";
        div.appendChild(tophyp);
        var conf = document.createElement('p');
        conf.className = "conf";
        div.appendChild(conf);
        var ul = document.createElement('ul');
        ul.className = "hypList";
        div.appendChild(ul);
        for (var i = 0; i < result.length; i++) {
            if (i == 0) {
                tophyp.innerText = result[i].transcript;
                conf.innerText = Math.round(result[i].confidence * 100) / 100;
            } else {
                var li = document.createElement('li');
                ul.appendChild(li);
                li.innerText = result[i].transcript;
            }
        }
        return div;
    }
    // Live top ASR Hyp
    if ($('#result_onebest').length != 0) {
        window.dialog.on("asr_result", function(event, asr_result){
            $result = $("#result_onebest");
            $result.empty();
            var final_text = "";
            var nonfinal_text = "";
            for (var i = 0; i < asr_result.results.length; i++) {
                if (asr_result.results[i].isFinal || (i<asr_result.results.length-1 && asr_result.results.length>1)) {
                    final_text += asr_result.results[i][0].transcript;
                  } else {
                    nonfinal_text += asr_result.results[i][0].transcript;
                  }     
            }
            $result.html(
                          final_text + " <span class='nonfinal'>"+nonfinal_text+"</span>"
                          );
            
        });
    }
    
    // Last system text
    window.dialog.on("tts_start", function(event, text) {
        $("#systext").text(text).addClass('speaking');
    });
    window.dialog.on("tts_end", function(event) {
        $("#systext").removeClass('speaking');
    });
    
    // Microphone on/off
    window.dialog.on("listening", function(event) {
        $("#mic_icon").addClass("listening");
    });
    window.dialog.on("not_listening", function(event) {
        $("#mic_icon").removeClass("listening");
    })
    
    // Error
    if ($('#error_text').length != 0) {
        window.dialog.on("error", function(event, error) {
            var $error_text = $('#error_text');
            $error_text.text(error).fadeIn();
            setTimeout(function() {
                $error_text.fadeOut();
            }, 2000);
        });
        $('#error_text').hide();    
    }
    

});