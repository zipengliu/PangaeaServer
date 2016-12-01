#!/bin/bash
sudo -E go install ~/go/src/github.com/wantonsolutions/Dviz
NAME="raft-putget-100-clean-1"
I=0
for file in *.json; do
    Dviz $file $NAME-$I.json
    $(( I = $I + 1 ))
done
