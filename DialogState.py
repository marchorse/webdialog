import utils
import json, os, web

class dialogState(object) :
    def __init__(self, session):
        self.dialog_number = session.dialog_number
        self.caller_id = session.session_id
        self.initial_prompt = "Hello, how may I help you?"
        self.asr_results = []
        self.recordings = []
        self.responses = []
        # a unique id for this dialog
        self.id =  utils.timestamp() + "_" + utils.random_string()
        self.date = utils.dateString()
        self.time = utils.timeString()
        
    def update(self, asr_result):
        self.asr_results.append(asr_result)
        top_hyp = asr_result["hyps"][0]
        response = {"tts": " ".join(reversed(top_hyp.split()))}
        if "bye" in top_hyp :
            response["ended"] = True
            response["tts"] = "Thank you good bye."
        self.responses.append(response)
        return response
    
    def toJSON(self):
        # convert self to json, in format compatible with DSTC
        out = {"turns":[], "session-id":self.id, "session-date":self.date, "session-time":self.time}
        out["system-specific"] = {
            "caller-id":self.caller_id,
            "dialog-number":self.dialog_number,
            "caller-ip":web.ctx['ip']
        }
        for i in range(len(self.asr_results)) :
            this_turn = {}
            this_turn["input"] = {
                "asr-hyps":[]
            }
            score = self.asr_results[i]["confidence"]
            for j, hyp in enumerate(self.asr_results[i]["hyps"]):
                if j == 0 :
                    this_turn["input"]["asr-hyps"].append({"asr-hyp":hyp, "score":score})
                else :
                    this_turn["input"]["asr-hyps"].append({"asr-hyp":hyp})
            
            try:
                this_turn["input"]["audio-file"] = self.recordings[i]
            except Exception:
                pass
            try:
                this_turn["output"] = {"transcript":self.responses[i]["tts"]}
            except Exception:
                pass
            
            out["turns"].append(this_turn)
            
        return json.dumps(out, indent=4)    
        
    def save(self):
        json = self.toJSON()
        savefile = open(os.path.join("logs",self.id+ ".json"), "w")
        savefile.write(json)
        savefile.close()
        
    
    