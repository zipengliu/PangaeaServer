#!/bin/bash
sudo -E go install ~/go/src/github.com/wantonsolutions/Dviz
NAME="raft-putget-100-fail-xor-3"
I=0
for file in *.json; do
    Dviz $file $NAME-$I.json
    $(( I = $I + 1 ))
done

mv *-*.json ../../../data/
