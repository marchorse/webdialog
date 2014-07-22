import datetime, time, random, string, os, sys
import web
from uuid import uuid4
from threading import Lock

def random_string():
    return ''.join(random.choice(string.ascii_uppercase) for x in range(5))


def timestamp(include_date=True):
    ts = time.time()
    if include_date :
        return datetime.datetime.fromtimestamp(ts).strftime('%Y%m%d_%H%M%S')
    return datetime.datetime.fromtimestamp(ts).strftime('%H%M%S')
    
def dateString():
    ts = time.time()
    return datetime.datetime.fromtimestamp(ts).strftime('%m-%d-%Y')

def timeString():
    ts = time.time()
    return datetime.datetime.fromtimestamp(ts).strftime('%H:%M:%S')


#-------- Make a locking session ---------

class LockingSession(web.session.Session):
    __slots__ = [
        "store", "_initializer", "_last_cleanup_time", "_config", "_data",
        "__getitem__", "__setitem__", "__delitem__", "lock"
    ]
    def __init__(self, app, store, initializer=None):
        web.session.Session.__init__(self, None, store, initializer)
        self.lock = Lock()
        if app:
            app.add_processor(self._locked_processor)
    
    def _locked_processor(self, handler):
        with self.lock:
            return self._processor(handler)
   
#-------- Locking disk store: Not being used any more ---------

class LockingDiskStore(web.session.Store):
    """
    Store which uses lock files
    """
    def __init__(self, root):
        # if the storage root doesn't exists, create it.
        if not os.path.exists(root):
            os.makedirs(
                    os.path.abspath(root)
                    )
        self.root = root

    def _get_path(self, key):
        if os.path.sep in key: 
            raise ValueError, "Bad key: %s" % repr(key)
        return os.path.join(self.root, key)
    
    def __contains__(self, key):
        path = self._get_path(key)
        return os.path.exists(path)

    def __getitem__(self, key):
        lockfile = self._lockfile(key)
        dt = 0.0
        while os.path.exists(lockfile) and dt < 30.0: # 30 second time out
            time.sleep(0.1)
            dt += 0.1
        if dt > 0.0 :
            print "waited",dt,"seconds for lock"
        f = open(lockfile, "w")
        f.write("lock")
        f.close()
        path = self._get_path(key)
        if os.path.exists(path): 
            pickled = open(path).read()
            return self.decode(pickled)
        else:
            raise KeyError, key

    def __setitem__(self, key, value):
        lockfile = self._lockfile(key)
        if os.path.exists(lockfile) :
            os.remove(lockfile)
        path = self._get_path(key)
        pickled = self.encode(value)    
        try:
            f = open(path, 'w')
            try:
                f.write(pickled)
            finally: 
                f.close()
        except IOError:
            pass

    def __delitem__(self, key):
        path = self._get_path(key)
        if os.path.exists(path):
            os.remove(path)
    
    def _lockfile(self, key):
        return self._get_path(key) + ".lock"
    
    
    def cleanup(self, timeout):
        now = time.time()
        for f in os.listdir(self.root):
            path = self._get_path(f)
            atime = os.stat(path).st_atime
            if now - atime > timeout :
                os.remove(path)

def import_class(cl):
    d = cl.rfind(".")
    classname = cl[d+1:len(cl)]
    m = __import__(cl[0:d], globals(), locals(), [classname])
    return getattr(m, classname)

def check_directory_structure(): 
    if not os.path.exists("logs"):
            os.makedirs("logs")
            
    if not os.path.exists(os.path.join("logs","wavs")):   
        os.makedirs(os.path.join("logs","wavs"))
    
    if not os.path.exists(os.path.join("templates","display.html")):      
        f = open(os.path.join("templates","display.html"),"w")
        f.write("<p></p>\n")
        f.close()
    if not os.path.exists(os.path.join("static","js","views.js")):      
        f = open(os.path.join("static","js","views.js"),"w")
        f.write("$(document).ready(function(){\n");
        f.write("\n")
        f.write("});")
        f.close()
    if not os.path.exists(os.path.join("static","css","display.css")):      
        f = open(os.path.join("static","css","display.css"),"w")
        f.write("\n");
        f.close()   
    
def clear_sessions():
    print "clearing sessions"
    for session in os.listdir("sessions"):
        os.remove(os.path.join("sessions", session))
    
