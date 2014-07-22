import web, json, os, cgi, ConfigParser
from uuid import uuid4
import utils
from web.wsgiserver import CherryPyWSGIServer
import traceback


webdialog_config = ConfigParser.ConfigParser()
try :
    webdialog_config.read("config.cfg")
except Exception:
    pass


#-------- set the dialog state object ----
import DialogState
dialog_state_class = DialogState.dialogState
if webdialog_config.has_option("webdialog", "dialog_state_class"):
    class_name = webdialog_config.get("webdialog", "dialog_state_class")
    try:
        dialog_state_class = utils.import_class(class_name)
    except Exception:
        print "unable to import dialogState", class_name
        traceback.print_exc()

#---------    Configure the server -----
web.config.debug = True
if webdialog_config.has_option("webdialog", "debug"):
    web.config.debug = (webdialog_config.has_option("webdialog", "debug"))
    
web.config.session_parameters['timeout'] = 86400*30  # thirty days
web.config.session_parameters['secret_key'] = '7a68f02c95dda0f81424d3ff68815151'
if webdialog_config.has_option("webdialog", "session_secret_key"):
    web.config.session_parameters['secret_key'] = webdialog_config.get("webdialog", "session_secret_key")
    

web.config.session_parameters['expired_message'] = 'Session expired'
CherryPyWSGIServer.ssl_certificate = "ssl/server.crt"
CherryPyWSGIServer.ssl_private_key = "ssl/server.key"

urls = (
    '/', 'index',
    '/dialog', 'dialog',
    '/dialog/asr_result', 'dialogASRResult',
    '/dialog/recording', 'dialogRecording',
    '/dialog/end', 'dialogEnd'
)

app = web.application(urls, globals())
render = web.template.render('templates/')

# store session in web.config allows debug mode to work, and auto-reloading of the modules
if web.config.get('_session') is None:
    session = utils.LockingSession(app, web.session.DiskStore('sessions'),
                              initializer={"dialog_state":None,"csrf_token":"not set","utterance_key":0, "dialog_number":0})

    web.config._session = session
else:
    session = web.config._session

# 
# Maximum input we will accept when REQUEST_METHOD is POST
cgi.maxlen = 10 * 1024 * 1024    # 10MB
                                # note the largest file we should be getting from recorder.js
                                # is about 2.6MB (one channel, 22 khz, 1 minute)

#---------    end of configuration -----

#---------    Classes which respond to HTTP(S) requests
class index:
    def GET(self):
        web.seeother('/dialog')
    
class dialog:
    def GET(self):
        if session.dialog_state == None:
            session.dialog_state = dialog_state_class(session)
        session.csrf_token = uuid4().hex
        session.utterance_key = 0
        return render.index({"session":session}, render.display())

class dialogASRResult:
    def POST(self):
        if session.dialog_state == None:
            session.dialog_state = dialog_state_class(session)
        event = json.loads(web.data())
        response = session.dialog_state.update(event["hypList"][-1])
        session["utterance_key"] = max(session["utterance_key"], event["utterance_key"])
        web.header('Content-Type', 'application/json')
        return json.dumps(response)

class dialogRecording:
    def POST(self):
        x = web.input()
        # check csrf token
        if (not x.has_key('csrf_token') or x["csrf_token"]!=session["csrf_token"]):
            print "tokens aren't matching"
            session["csrf_token"] = uuid4().hex        
        else :
            # protect using csrf_token
                if "data" in x :
                    fname = os.path.join("logs","wavs", \
                                         session.dialog_state.id + "_" + utils.timestamp(include_date=False) + ".wav")
                    savefile = open(fname,"wb")
                    savefile.write(x["data"])
                    savefile.close()
                    # Warn if this is not for the most recent utterance
                    if not x.has_key("utterance_key") or int(session["utterance_key"]) != int(x["utterance_key"]) :
                        print "got recording with wrong utterance_key"
                        print "comparing", x["utterance_key"], session["utterance_key"]                    
                    uttIndex = int(x["utterance_key"])
                    for i in range(len(session.dialog_state.recordings), uttIndex+1):
                        session.dialog_state.recordings.append("")
                    session.dialog_state.recordings[uttIndex] = fname
                    session["utterance_key"] = max(uttIndex, session["utterance_key"])

        web.header('Content-Type', 'application/json')
        return json.dumps({
            "csrf_token":session["csrf_token"]
            })

class dialogEnd:
    def POST(self):
        if session.dialog_state != None :
            session.dialog_state.save()
            session.dialog_number += 1
            session.dialog_state = dialog_state_class(session)
            session["utterance_key"] = 0


if __name__ == '__main__':
    if web.config.debug:
        utils.clear_sessions()
    utils.check_directory_structure()
    app.run()