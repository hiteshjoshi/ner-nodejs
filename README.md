# Usage #


## Server ##
Make sure the server is running. If not run it like this
java -mx1500m -cp stanford-ner-2015-04-20/stanford-ner.jar edu.stanford.nlp.ie.NERServer -loadClassifier stanford-ner-2015-04-20/classifiers/english.muc.7class.distsim.crf.ser.gz -port 8000

## Client ##
just do node index to run client