var getCurrentNewsAndSentiment = function(){
    return new Promise(function (resolve, reject) {
var currentNewsAndSentimentKey = "mostRecentCurrentNewsAndSentimentFromApi";
var useAPI = true;
var rateLimit = 20;  //will use 20 seconds for testing, will use 600 seconds for production
var recentSnapshot = JSON.parse(localStorage.getItem(currentNewsAndSentimentKey));

if (recentSnapshot){
    console.log("we have local storage data");
    console.log("last time api was called " + recentSnapshot.mostRecentApiCall);
    var currentTime = new Date().toLocaleString();
    console.log("current time is " + currentTime);
    var difference = (Date.parse(currentTime) - Date.parse(recentSnapshot.mostRecentApiCall)) / 1000;
    console.log("api was last called " + difference + " seconds ago");
    if (difference < rateLimit){
        console.log("data less than 20 sec, using local storage data");
        useAPI = false;
    }
    
} else {
    console.log("we don't have local storage data");

}
if (useAPI){
    console.log("we are going to use the API");
    getCurrentNewsAndSentimentFromApi()
      .then(function(result) {
       console.log("we got data from the API");
       console.log(result);
       // TODO  - save to local storage.  also need to same a date/timestamp of when the api was called
       var lastApiCallTimestamp = new Date().toLocaleString();

       var newsSnapshot = {};
       newsSnapshot.news = result;
       newsSnapshot.mostRecentApiCall = lastApiCallTimestamp;
       localStorage.setItem(currentNewsAndSentimentKey, JSON.stringify(newsSnapshot));
      
        resolve (newsSnapshot);
      })
     .catch(function(error) {
        reject (error);
      })

} else{
    console.log("we aren't going to use the API");
    resolve (recentSnapshot);
}
    });
};

var getCurrentNewsAndSentimentFromApi = function() {
    return new Promise(function (resolve, reject) {
            var result = ["apple", "banana", "orange"];
            resolve(result);
    });
};

var newsButtonClicked = function () {
    console.log("============================");
    console.log("news button clicked");
    getCurrentNewsAndSentiment()
    .then(function(news){

    
    console.log("return from getCurrentNewsAndSentiment with news");
    console.log(news);
    console.log("============================");
    })
    .catch(function(error){
    console.log("return from getCurrentNewsAndSentiment with error");
    console.log(error);
    console.log("============================");
    })
  };

// get news button is clicked
$("#news-button").on("click", newsButtonClicked);
