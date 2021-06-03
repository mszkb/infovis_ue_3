import pandas as pd
from os import path
#this pyhton code prepares the token_gold_price data for the files
#that are stored in the following dictionary fileDict:
fileDict={"EU":"eu.csv",
          "China":"cn.csv",
          "Korea":"kr.csv",
          "Taiwan":"tw.csv",
          "Americas":"us.csv"}

outputDF=pd.DataFrame()
for region, fileName in fileDict.items():
    testData =pd.read_csv(path.join("static","data",fileName))

    #save the time attribute correctly
    testData["UTC"]=pd.to_datetime(testData["UTC"], format="%Y-%m-%d %H:%M:%S")
    testData.drop('UNIX timestamp',inplace=True,axis=1)

    #only consider data from 6 May 2015 onwards as from this date on, all regions exihibit token_gold_prices
    testData=testData[testData["UTC"] >= "2015-05-06"]

    # the original data saves the token_gold_price every 20 minutes. To save space, we will only use the daily mean prices:
    # calculate mean value per day
        cols = testData.columns.difference(['UTC'])
        # if possible convert to float
        testData[cols] = testData[cols].astype(float)
        testDataMean= testData.resample('d', on='UTC').mean().dropna(how='all')

        testDataMean["date"] = testDataMean.reset_index().UTC.dt.strftime('%Y-%m-%d').to_list()

    testDataMean=testDataMean.\
        reset_index().drop("UTC",axis=1).\
        set_index("date")

    testDataMean.rename(columns={testDataMean.columns.to_list()[0]:"price"},inplace=True)
    testDataMean["region"]=region
    outputDF=pd.concat([outputDF, testDataMean])

outputDF.to_csv(path.join("static","data","dataAggregated.csv"))
#use pivot_wider to store the gold_token_prices for each region in a separate column
outputDF.pivot(columns="region", values="price").bfill(axis=0).to_csv(path.join("static","data","dataAggregatedPivot.csv"))
