Introduction
===========

**webdialog** is a very simple Python framework which allows you to deploy a dialog system as a web service. It uses Google's Speech Recognition and Text to Speech in the Chrome browser, and implements a dialog manager as a Python object.

* Uses web.py to create a webserver which serves the webpages and the dialog system
* Incremental speech recognition runs in the browser, using a streaming connection to Google's servers
* All you have to do is implement a Python class which has an ```update(self, asr_results)``` method, which returns the system's response
* Dialog logs are saved on the server side, along with recordings of the user utterances in WAV format
* Easy to add new views in the dialog system, to visualise more than just the recognition results and system speech
* Currently runs only in Google Chrome, the only browser yet to implement the [WebSpeech API](https://dvcs.w3.org/hg/speech-api/raw-file/tip/speechapi.html) `SpeechRecognition` object.

Demo
======
A demo of a basic demo system, which simply reverses what it thinks you said, should be live [at webdialogdemo.matthen.com](https://webdialogdemo.matthen.com:8080). You will have to accept the self-signed SSL certificate, and run the demo in Chrome.

Get Started
===========

The best way to get started and see how it works is to follow the [quick tutorial in the wiki](https://bitbucket.org/matthen/webdialog/wiki/Get%20Started).


## Outline of the turn taking process in a running dialog:

![Turn taking structure](http://www.matthen.com/misc/structure.png)

## Screenshot
![Screenshot of a webdialog turn](http://www.matthen.com/misc/example_turn.png)

## Citing webdialog

If you use webdialog for an academic publication, please consider citing:

Matthew Henderson, "[The webdialog Framework for Spoken Dialog in the Browser](http://mi.eng.cam.ac.uk/~mh521/papers/The_webdialog_Framework_for_Spoken_Dialog_in_the_Browser.pdf)". 
University of Cambridge Engineering Department technical report CUED/F-INFENG/TR.69, 2014.



License
========

This work is licensed under a [Creative Commons Attribution-NonCommercial 3.0 Unported License](http://creativecommons.org/licenses/by-nc/3.0/deed.en_US). 