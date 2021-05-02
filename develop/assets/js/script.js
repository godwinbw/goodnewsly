////------------------------------------------------------
////
////  RATE LIMIT API section start
////
////  Rate limit api limits how frequenty the API can
////  be called.  For development, limit to once every 20 seonds
///   for production, once every 600 seconds (10 minutes)
////------------------------------------------------------

var getCurrentNewsAndSentiment = function () {
  return new Promise(function (resolve, reject) {
    var currentNewsAndSentimentKey = "mostRecentCurrentNewsAndSentimentFromApi";
    var useAPI = true;
    var rateLimit = 20; //will use 20 seconds for testing, will use 600 seconds for production
    var recentSnapshot = JSON.parse(
      localStorage.getItem(currentNewsAndSentimentKey)
    );

    if (recentSnapshot) {
      console.log("we have local storage data");
      console.log(
        "last time api was called " + recentSnapshot.mostRecentApiCall
      );
      var currentTime = new Date().toLocaleString();
      console.log("current time is " + currentTime);
      var difference =
        (Date.parse(currentTime) -
          Date.parse(recentSnapshot.mostRecentApiCall)) /
        1000;
      console.log("api was last called " + difference + " seconds ago");
      if (difference < rateLimit) {
        console.log("data less than 20 sec, using local storage data");
        useAPI = false;
      }
    } else {
      console.log("we don't have local storage data");
    }
    if (useAPI) {
      console.log("we are going to use the API");
      getCurrentNewsAndSentimentFromApi()
        .then(function (result) {
          console.log("we got data from the API");
          console.log(result);
          // TODO  - save to local storage.  also need to same a date/timestamp of when the api was called
          var lastApiCallTimestamp = new Date().toLocaleString();

          var newsSnapshot = {};
          newsSnapshot.news = result;
          newsSnapshot.mostRecentApiCall = lastApiCallTimestamp;
          localStorage.setItem(
            currentNewsAndSentimentKey,
            JSON.stringify(newsSnapshot)
          );

          resolve(newsSnapshot);
        })
        .catch(function (error) {
          reject(error);
        });
    } else {
      console.log("we aren't going to use the API");
      resolve(recentSnapshot);
    }
  });
};

////------------------------------------------------------
////  API SECTION START
////
////  This section of code implements API functionality
////
////
////  Four function calls:
////
////  getCurrentNewsAndSentimentFromApi()
////        - retrieves current news stories
////
////  getCurrentNewsAndSentimentFromApiByKeyword(keyworkQuery)
////        - retrieves current news stories that match keyworkQuery
////        - keywordQuery is a keyword string eg "ambulance"
////
////  getCurrentNewsAndSentimentFromApiByCategories(categoryArray)
////        - retrieves current news stories that match categoryArray
////        - categoryArray is string array, eg ["sports", "technology"]
////
////   getCurrentNewsAndSentimentFromApiByKeywordAndCategory(keywordQuery, categoryArray)
////        - arguments are same format as the other functions
////
////    All these functions are Promise-based asynchronous functions
////    Call them like this:
////
////        getCurrentNewsAndSentimentFromApi()
////             .then(data => console.log(data))
////             .catch(error => console.log(error));
////
////
////    sentiment data is an object where score is 0.0 to 1.0 in three categoreis negative, neutral, and positive
////        - eg.  {negative: 0.589, neutral: 0.249, positive: 0.162}
////        - we do min-max scaling on the sentiment to do a "goodnews-score" in the range -1.0 to 1.0
////        - valid-good-news-score will be set to TRUE if there is a valid goodnews-score, otherwise set to FALSE
////
//// ------------------------------------------------------

// helper function to pass error info back to caller
var getErrorStatus = function (errorName, errorMessage) {
  // builds a data structure of instanceof(Error)
  // for the return object
  var errorStatus = new Error();
  errorStatus.name = errorName;
  errorStatus.message = errorMessage;

  return errorStatus;
};

var currentsApi = {
  apiKey: "pqlXoMwbO6xGnewLW6Hf_tECeZ-U2u5T8E8u-SE-XwoCEdYO",
  latestNewsEndpoint: "https://api.currentsapi.services/v1/latest-news",
  searchEndpoint: "https://api.currentsapi.services/v1/search",

  getCurrentNewsQuery: function () {
    return this.latestNewsEndpoint + "?language=en&apiKey=" + this.apiKey;
  },

  getKeywordQuery: function (keywordQuery) {
    return (
      this.searchEndpoint +
      "?language=en&apiKey=" +
      this.apiKey +
      "&keywords=" +
      keywordQuery
    );
  },

  getCategoryQuery: function (categoryQuery) {
    return (
      this.searchEndpoint +
      "?language=en&apiKey=" +
      this.apiKey +
      "&category=" +
      categoryQuery
    );
  },

  getKeywordAndCategoryQuery: function (keywordQuery, categoryQuery) {
    return (
      this.searchEndpoint +
      "?language=en&apiKey=" +
      this.apiKey +
      "&category=" +
      categoryQuery +
      "&keywords=" +
      keywordQuery
    );
  },
};

// variable to hold parallel dots api info
var parallelDots = {
  apiKey: "7ES25jNlQY5RISQu4JW2SuFWC6w6QWobpHxoOuuBPLk",
  sentimentEndpoint: "https://apis.paralleldots.com/v4/sentiment",
  sentimentBulkEndpoint: "https://apis.paralleldots.com/v4/sentiment_batch",

  getSentimentQuery: function () {
    return this.sentimentEndpoint;
  },

  getSentimentBulkQuery: function () {
    return this.sentimentBulkEndpoint;
  },

  getSentimentBulkParameters: function (queryArray) {
    var fetchOptions = {};
    fetchOptions.method = "POST";

    var formData = new FormData();
    formData.append("text", JSON.stringify(queryArray));
    formData.append("api_key", this.apiKey);
    formData.append("lang_code", "en");

    fetchOptions.body = formData;

    return fetchOptions;
  },

  getSentimentParameters: function (queryText) {
    var fetchOptions = {};
    fetchOptions.method = "POST";

    var formData = new FormData();
    formData.append("text", queryText);
    formData.append("api_key", this.apiKey);
    formData.append("lang_code", "en");

    fetchOptions.body = formData;

    return fetchOptions;
  },
};

var getNewsDescriptionArray = function (newsDataArray) {
  // take the news data array, and build an array of the descriptions
  var textArray = [];

  newsDataArray.forEach((newsItem) => {
    textArray.push(newsItem.title);
  });

  //console.log("   created a textArray with " + textArray.length + " items");
  return textArray;
};

var getGoodNewsScore = function (sentiment) {
  // sentiment is object in form
  // {negative: 0.589, neutral: 0.249, positive: 0.162}
  //
  if (sentiment.positive && sentiment.negative && sentiment.neutral) {
    return (
      sentiment.positive * 1.0 +
      sentiment.neutral * 0.0 +
      sentiment.negative * -1.0
    );
  } else {
    // indicates that the good news score is not valid
    return -10;
  }
};

var getSentimentBulk = function (news) {
  return new Promise(function (resolve, reject) {
    //console.log("getSentimentBulk START...");

    var textArray = getNewsDescriptionArray(news);
    var sentimentUrl = parallelDots.getSentimentBulkQuery();
    var sentimentOptions = parallelDots.getSentimentBulkParameters(textArray);
    var goodnewsScore;

    fetch(sentimentUrl, sentimentOptions)
      .then(function (sentimentResponse) {
        if (sentimentResponse.ok) {
          sentimentResponse.json().then(function (sentimentData) {
            //console.log("----- Query Text ------");
            //console.log("   " + textArray.length + " items");
            //console.log("----- Sentiment Data ------");
            //console.log("   " + sentimentData.sentiment.length + " items");
            //console.log(sentimentData.sentiment);
            //console.log("---------------------------");

            console.log(
              "...got " + sentimentData.sentiment.length + " sentiment scores"
            );

            // need to add sentiment data to news
            for (var i = 0; i < sentimentData.sentiment.length; i++) {
              //get the goodnews score for this element
              //console.log(
              //  "...getting goodnews score for index " +
              //    i +
              //   "item -> " +
              //    JSON.stringify(sentimentData.sentiment[i])
              //);

              goodnewsScore = getGoodNewsScore(sentimentData.sentiment[i]);

              // if this index exists in news, add them item and good news score to the news array
              if (!(typeof news[i] === "undefined")) {
                news[i].sentiment = sentimentData.sentiment[i];
                if (goodnewsScore == -10) {
                  news[i].good_news_score = goodnewsScore;
                  news[i].valid_good_news_score = false;
                } else {
                  // this is a valid good news score
                  news[i].good_news_score = goodnewsScore;
                  news[i].valid_good_news_score = true;
                }
              }
            }

            // now sort the news array by good news score
            news.sort(function (a, b) {
              if (a.good_news_score > b.good_news_score) {
                // if a > b return -1;
                return -1;
              } else if (a.good_news_score < b.good_news_score) {
                // if a < b return 1;
                return 1;
              } else {
                // if a = b return 0;
                return 0;
              }
            });

            //console.log("----- News + Sentiment Data ------");
            //console.log(news);
            //console.log("----------------------------------");

            // return the update news array
            resolve(news);
          });
        } else {
          // the response code was not ok
          console.log(
            "....sentiment fetch failed, response status -> " + response.status
          );

          var errorMessage = response.status + " - " + response.statusText;
          reject(getErrorStatus("News fetch failed", errorMessage));
        }
      })
      .catch(function (error) {
        //likely had a network error
        console.log(
          "....sentiment fetch failed, error message -> " + error.message
        );
        reject(error);
      });
  });
};

// gets the current news
var getNews = function (newsQueryUrl) {
  return new Promise(function (resolve, reject) {
    console.log("getNews START...");

    console.log("fetchURL -> " + newsQueryUrl);

    fetch(newsQueryUrl)
      .then(function (response) {
        if (response.ok) {
          // we got the data
          response.json().then(function (responseData) {
            //console.log("------- News Data ---------");
            //console.log(responseData);
            //console.log("---------------------------");
            //console.log("------- Text Array --------");
            //console.log(textArray);
            //console.log("---------------------------");
            console.log("...got " + responseData.news.length + " news stories");

            getSentimentBulk(responseData.news)
              .then(function (sentimentResult) {
                resolve(sentimentResult);
              })
              .catch(function (error) {
                reject(error);
              });
          });
        } else {
          // the response code was not ok
          console.log(
            "....fetch failed, response status -> " + response.status
          );

          var errorMessage = response.status + " - " + response.statusText;
          reject(getErrorStatus("News fetch failed", errorMessage));
        }
      })
      .catch(function (error) {
        // most likely a network error occured
        console.log("....fetch failed, error message -> " + error.message);
        reject(error);
      });
  });
};

var sanitizeKeywordQuery = function (keywordQuery) {
  /// sanitize the keyword query to replace spaces with '+' symbol
  /// and remove any special characters

  // first, replace multiple consecutive whitespace with a "+"
  var keywordSpacesReplaced = keywordQuery.replace(/\s\s+/g, "+");

  var keywordSpecialCharsReplaced = keywordSpacesReplaced.replace(
    /[&\/\\#,+()$~%.'":*?<>{}]/g,
    ""
  );

  //console.log("original keywords -> " + keywordQuery);
  //console.log("new keywords      -> " + keywordSpecialCharsReplaced);

  return keywordSpecialCharsReplaced;
};
///
/// CALL THESE FUNCTIONS TO USE THE APIs
///
///

var getCurrentNewsAndSentimentFromApi = function () {
  return new Promise(function (resolve, reject) {
    console.log("---- PROMISE START ----------------------");
    console.log("getCurrentNewsAndSentimentFromApi");
    getNews(currentsApi.getCurrentNewsQuery())
      .then(function (result) {
        console.log("---- PROMISE RESOLVED ----------------------");
        resolve(result);
      })
      .catch(function (error) {
        console.log("---- PROMISE REJECTED ----------------------");
        reject(error);
      });
  });
};

var getCurrentNewsAndSentimentFromApiByKeyword = function (keywordQuery) {
  return new Promise(function (resolve, reject) {
    console.log("---- PROMISE START ----------------------");
    console.log("getCurrentNewsAndSentimentFromApiByKeyword");
    var sanitizedKeyword = sanitizeKeywordQuery(keywordQuery);
    console.log("keywords -> " + sanitizedKeyword);

    getNews(currentsApi.getKeywordQuery(sanitizedKeyword))
      .then(function (result) {
        console.log("---- PROMISE RESOLVED ----------------------");
        resolve(result);
      })
      .catch(function (error) {
        console.log("---- PROMISE REJECTED ----------------------");
        reject(error);
      });
  });
};

var getCurrentNewsAndSentimentFromApiByCategory = function (categoryArray) {
  return new Promise(function (resolve, reject) {
    console.log("---- PROMISE START ----------------------");
    console.log("getCurrentNewsAndSentimentFromApiByCategory");
    console.log("categories -> " + categoryArray.join());

    getNews(currentsApi.getCategoryQuery(categoryArray.join()))
      .then(function (result) {
        console.log("---- PROMISE RESOLVED ----------------------");
        resolve(result);
      })
      .catch(function (error) {
        console.log("---- PROMISE REJECTED ----------------------");
        reject(error);
      });
  });
};

var getCurrentNewsAndSentimentFromApiByKeywordAndCategory = function (
  keywordQuery,
  categoryArray
) {
  return new Promise(function (resolve, reject) {
    console.log("---- PROMISE START ----------------------");
    console.log("getCurrentNewsAndSentimentFromApiByKeywordAndCategory");
    var sanitizedKeyword = sanitizeKeywordQuery(keywordQuery);
    console.log("keywords -> " + sanitizedKeyword);
    console.log("categories -> " + categoryArray.join());

    getNews(
      currentsApi.getKeywordAndCategoryQuery(
        sanitizedKeyword,
        categoryArray.join()
      )
    )
      .then(function (result) {
        console.log("---- PROMISE RESOLVED ----------------------");
        resolve(result);
      })
      .catch(function (error) {
        console.log("---- PROMISE REJECTED ----------------------");
        reject(error);
      });
  });
};

////------------------------------------------------------
////
////  API SECTION END
////
////------------------------------------------------------

//// -----------------------------------------------------
////
////  TEST SECTION START
////
////  these functions test the api calls with various input data
////
//// -----------------------------------------------------

var newsButtonClicked = function () {
  console.log("============================");
  console.log(
    "news button clicked.  Here is where we want to turn on the animation."
  );
  //Here is where we want to turn on the animation
  $("#waiting-for-news-animation-holder").show();
  getCurrentNewsAndSentiment()
    .then(function (news) {
      console.log("return from getCurrentNewsAndSentiment with news");
      console.log(news);
      console.log("============================");
    })
    .catch(function (error) {
      console.log("return from getCurrentNewsAndSentiment with error");
      console.log(error);
      console.log("============================");
    })
    .finally(function () {
      console.log("Here is where we want to turn off the animation.");
      $("#waiting-for-news-animation-holder").hide();
    });
};

var newsKeywordSearchClicked = function () {
  console.log("=========================================");
  console.log("newsKeywordSearchClicked");
  getCurrentNewsAndSentimentFromApiByKeyword("basketball")
    .then(function (result) {
      console.log(result);
      console.log("newsButtonClicked SUCCESS");
      console.log("=========================================");
    })
    .catch(function (error) {
      console.log(error);
      console.log("newsButtonClicked ERROR");
      console.log("=========================================");
    });
};

var newsSingleCategorySearchClicked = function () {
  console.log("=========================================");
  console.log("newsSingleCategorySearchClicked");
  getCurrentNewsAndSentimentFromApiByCategory(["television"])
    .then(function (result) {
      console.log(result);
      console.log("newsSingleCategorySearchClicked SUCCESS");
      console.log("=========================================");
    })
    .catch(function (error) {
      console.log(error);
      console.log("newsSingleCategorySearchClicked ERROR");
      console.log("=========================================");
    });
};

var newsMultiCategorySearchClicked = function () {
  console.log("=========================================");
  console.log("newsMultiCategorySearchClicked");

  getCurrentNewsAndSentimentFromApiByCategory([
    "television",
    "finance",
    "politics",
  ])
    .then(function (result) {
      console.log(result);
      console.log("newsMultiCategorySearchClicked SUCCESS");
      console.log("=========================================");
    })
    .catch(function (error) {
      console.log(error);
      console.log("newsMultiCategorySearchClicked ERROR");
      console.log("=========================================");
    });
};

var newsKeywordAndSingleCategorySearchClicked = function () {
  console.log("=========================================");
  console.log("newsKeywordAndSingleCategorySearchClicked");
  getCurrentNewsAndSentimentFromApiByKeywordAndCategory("basketball", [
    "sports",
  ])
    .then(function (result) {
      console.log(result);
      console.log("newsKeywordAndSingleCategorySearchClicked SUCCESS");
      console.log("=========================================");
    })
    .catch(function (error) {
      console.log(error);
      console.log("newsKeywordAndSingleCategorySearchClicked ERROR");
      console.log("=========================================");
    });
};

var newsKeywordAndMultiCategorySearchClicked = function () {
  console.log("=========================================");
  console.log("newsKeywordAndMultiCategorySearchClicked");
  getCurrentNewsAndSentimentFromApiByKeywordAndCategory("basketball", [
    "sports",
    "finance",
    "politics",
  ])
    .then(function (result) {
      console.log(result);
      console.log("newsKeywordAndMultiCategorySearchClicked SUCCESS");
      console.log("=========================================");
    })
    .catch(function (error) {
      console.log(error);
      console.log("newsKeywordAndMultiCategorySearchClicked ERROR");
      console.log("=========================================");
    });
};

/// need to hide the news-roll animation on first load
$("#waiting-for-news-animation-holder").hide();

/// these are bindings to button clicked handlers;

// get news button is clicked
$("#search-current-news-button").on("click", newsButtonClicked);

// keyword search is clicked
$("#news-keyword-search").on("click", newsKeywordSearchClicked);

// single category search
$("#news-single-category-search").on("click", newsSingleCategorySearchClicked);

// multiple category search
$("#news-multi-category-search").on("click", newsMultiCategorySearchClicked);

// keyword and single category search
$("#news-keyword-and-single-category-search").on(
  "click",
  newsKeywordAndSingleCategorySearchClicked
);

// keyword and multiple category search
$("#news-keyword-and-multi-category-search").on(
  "click",
  newsKeywordAndMultiCategorySearchClicked
);
