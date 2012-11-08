#!/bin/bash

# author: dohoangkhiem@gmail.com

#WORKING_DIR="/vagrant/delivery"
WORKING_DIR="/home/khiem/tmp/uc4-test"
#GIT_REPO="/vagrant/git/repo"
GIT_REPO="/home/khiem/tmp/uc4-git"
TMP_DIR="/tmp/vagrant-tmp"
TOMCAT_HOME="/home/khiem/tmp/uc4-tomcat"
#DELIVERY_LOG="/vagrant/delivery.txt"
#DEPLOYMENT_LOG="/vagrant/deployment.txt"
DELIVERY_LOG="/home/khiem/tmp/delivery.txt"
DEPLOYMENT_LOG="/home/khiem/tmp/deployment.txt"
COUNTER=0

# $1: log level: info, warning, debug, error
# $2: message
deliveryLog() {
  level="$1"
  echo -e "$(date) - ${level^^} - $2" >> "$DELIVERY_LOG"
}

# $1: log level
# $2: message
deploymentLog() {
  level="$1"
  echo -e "$(date) - ${level^^} - $2" >> "$DEPLOYMENT_LOG"
}

# initilizes the daemon
init() {
  deliveryLog "info" "Initializing daemon..."
  if [[ ! -d $TMP_DIR ]]; then
    mkdir $TMP_DIR
  else
    rm -rf $TMP_DIR/*
  fi
  
  if [[ ! -f $DELIVERY_LOG ]]; then
    touch $DELIVERY_LOG
  fi
  
  if [[ ! -f $DEPLOYMENT_LOG ]]; then
    touch $DEPLOYMENT_LOG
  fi
}

# utility function to trim both leading and trailing spaces from string
trim() {
    local var=$1
    var="${var#"${var%%[![:space:]]*}"}"   # remove leading whitespace characters
    var="${var%"${var##*[![:space:]]}"}"   # remove trailing whitespace characters
    echo -n "$var"
}

# kick-start the daemon
runDaemon() {
  init
  #while true; do
  #  res=$(inotifywait -e create $WORKING_DIR)
  #  echo $res
  #  if [ res ]; then
  #    COUNTER=$((COUNTER+1))
  #    # grab the filename (without path)
  #    f="${res#?*CREATE }"
  #    # log: INFO
  #    deliveryLog "info" "New file create $f"
  #    if [[ "$f" == *.tar.gz || "$f" == *.zip ]]; then
  #      processArchive "$f"
  #    fi
  # fi
  #done
  
  # run inotifywait as a daemon
  inotifywait -m -r --format '%f' -e create "$WORKING_DIR" | while read f
  do
    COUNTER=$((COUNTER+1))
    deliveryLog "info" "New file create $f"
    if [[ "$f" == *.tar.gz || "$f" == *.zip ]]; then
      processArchive "$f" &
    fi
  done
}

# parse manifest file and process commit files and deploy war archive
# param $1: the archive file .tar.gz or .zip
processArchive() {
  local f=$1
  deliveryLog "info" "Processing archive $f .."
  if [[ "$f" == *.tar.gz ]]; then
    deliveryLog "debug" "Extracting $f to $TMP_DIR/$COUNTER .."
    mkdir "/$TMP_DIR/$COUNTER"
    tar xvf "$WORKING_DIR/$f" -C "$TMP_DIR/$COUNTER" > /dev/null
  elif [[ "$f" == *.zip ]]; then
    deliveryLog "debug" "Extracting $f to /$TMP_DIR/$COUNTER .."
    mkdir "/$TMP_DIR/$COUNTER"
    unzip "$WORKING_DIR/$f" -d "$TMP_DIR/$COUNTER"
  else
    return
  fi
  
  local tmp="$TMP_DIR/$COUNTER"
  local manifest="$tmp/manifest.txt"
  if [ ! -f $manifest ]; then
    deliveryLog "warning" "Can't find manifest.txt from $f archive"
    return
  fi
  deliveryLog "debug" "Read file $manifest"
  deliveryLog "debug" "---------------------------------------------"
  # read the manifest file line by line
  while read line           
  do
    local trimmed=$(trim "$line")
    deliveryLog "debug" "$trimmed"
    local filename
    local branch
    local message
    #skip comment
    if [[ $trimmed != \#* ]]; then
      #echo -e "$trimmed"
      # split line by commas
      IFS=',' read -ra ADDR <<< "$trimmed"
      for (( i = 0 ; i < ${#ADDR[@]} ; i++ )) do
        local segmentName
        local segment=$(trim "${ADDR[$i]}")
        if [[ $i == 0 ]]; then
          segmentName="File name"
          filename="$segment"
        elif [[ $i == 1 ]];  then
          segmentName="Branch name"
          branch="$segment"
        elif [[ $i == 2 ]]; then
          segmentName="Message"
          message="$segment"
        else
          break
        fi
        
        deliveryLog "debug" "$segmentName: $segment"
        # yadda yadda
      done
      
      if [ ! -f $tmp/$filename ]; then
        deliveryLog "warning" "Couldn't find the file $filename in archive $f" 
        continue
      fi
      
      # commit file to git
      # force to switch branch
      local committed=-1
      (
        git --git-dir=$GIT_REPO/.git --work-tree=$GIT_REPO checkout $branch > /dev/null 2>&1 &&
        cp $tmp/$filename $GIT_REPO/$filename &&
        git --git-dir=$GIT_REPO/.git --work-tree=$GIT_REPO add $GIT_REPO/$filename > /dev/null 2>&1 &&
        git --git-dir=$GIT_REPO/.git --work-tree=$GIT_REPO commit -m "$message" > /dev/null 2>&1 &&
        committed=0 &&
        deliveryLog "info" "Committed file $filename to $branch successfully"
      ) ||
      (
        deliveryLog "error" "Failed to commit $filename to $branch"
        continue
      )
      
      # if commit successfully
      #if [ ! $committed ]; then
      #  #deliveryLog "error" "Failed to commit $filename to $branch"
      #  #continue
      #fi
      
      # check for war archive
      if [[ $filename == *.war ]]; then
        deliveryLog "debug" "Got war archive: $filename"
        # checkout the given branch on git dir
        # ensure the given branch is checked out on git repo
        git --git-dir=$GIT_REPO/.git --work-tree=$GIT_REPO checkout > /dev/null 2>&1
        # check for the war file
        # deploy war file on Tomcat
        # copy to Tomcat's webapp as [branchname]-[appname].war
        local newName="$branch-$filename"
        local appName="${newName%.*}"
        if [ -f $GIT_REPO/$filename ]; then
          #if [ -f "$TOMCAT_HOME/webapps/$newName" || -d "$TOMCAT_HOME/webapps/$appName" ]; then
          (rm -rf "$TOMCAT_HOME/webapps/$newName" "$TOMCAT_HOME/webapps/$appName" &&
          #fi
          cp "$GIT_REPO/$filename" "$TOMCAT_HOME/webapps/$newName" &&
          deploymentLog "info" "Successfully deployed $appName in Tomcat $TOMCAT_HOME/webapps") ||
          (deploymentLog "error" "Failed to deploy $GIT_REPO/$filename to Tomcat $TOMCAT_HOME/webapps")
        # else
        #   deploymentLog "error" "Archive $GIT_REPO/$filename does not exist"
        fi
        # 
        # if error occurs, append to deployment log file
      fi
    fi
    
  # at the end, delete the tmp dir?
  
  
  done < $manifest
}

# run daemon
runDaemon