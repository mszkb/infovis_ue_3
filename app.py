from flask import Flask, render_template
import json
import pandas as pd



app = Flask(__name__)

# ensure that we can reload when we change the HTML / JS for debugging
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['TEMPLATES_AUTO_RELOAD'] = True



@app.route('/')
def data():
    # load real data into pd
    testData=pd.read_csv("static/data/dataAggregated.csv")
    return render_template("index.html", data=json.dumps(testData.to_json()))

if __name__ == '__main__':
    app.run()
