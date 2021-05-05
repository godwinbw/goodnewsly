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
    var rateLimit = 30 * 60 * 60; //will use 20 seconds for testing, will use 600 seconds for production
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

          var lastApiCallTimestamp = new Date().toLocaleString();

          var newsSnapshot = {};
          newsSnapshot.news = result;
          newsSnapshot.mostRecentApiCall = lastApiCallTimestamp;
          localStorage.setItem(
            currentNewsAndSentimentKey,
            JSON.stringify(newsSnapshot)
          );

          resolve(newsSnapshot.news);
        })
        .catch(function (error) {
          reject(error);
        });
    } else {
      console.log("we aren't going to use the API");
      resolve(recentSnapshot.news);
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
            //console.log(sentimentData);
            //console.log("   " + sentimentData.sentiment.length + " items");
            //console.log(sentimentData.sentiment);
            //console.log("---------------------------");

            if (sentimentData.sentiment) {
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
            } else {
              // for some reason we didn't get sentiment data, likely due to exceeded API limits
              reject(
                getErrorStatus(
                  "Bulk sentiment failed",
                  "likely exceeded daily API Limit"
                )
              );
            }
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
  var keywordMultipleSpacesReplaced = keywordQuery.replace(/\s\s+/g, " ");

  var keywordSpecialCharsReplaced = keywordMultipleSpacesReplaced.replace(
    /[&\/\\#,+()$~%.'":*?<>{}]/g,
    ""
  );

  var keywordsInsertPlusSeparator = keywordSpecialCharsReplaced.replace(
    /\s/g,
    "+"
  );

  //console.log("original keywords -> " + keywordQuery);
  //console.log(
  //  "after multiple spaces replaced -> " + keywordMultipleSpacesReplaced
  //);
  //console.log(
  //  "after special chars stripped      -> " + keywordSpecialCharsReplaced
  //);
  //console.log("after plus sign inserted -> " + keywordsInsertPlusSeparator);

  return keywordsInsertPlusSeparator;
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

var convertGoodnewsScoreToIcon = function (goodnewsscore) {
  //  0.6 and 1 -> positive high
  //  0.2 to 0.6 -> positive medium
  //  -0.2 to 0.2 -> neutral
  //  -0.6 to -0.2 -> negative medium
  //  -1.0 to -0.6 - > negative high

  //TODO need to add a return for when goodnewsscore is -10

  if (goodnewsscore >= 0.6) {
    return "./assets/images/positive-high.png";
  } else if (goodnewsscore >= 0.2) {
    return "./assets/images/positive-medium.png";
  } else if (goodnewsscore >= -0.2) {
    return "./assets/images/neutral.png";
  } else if (goodnewsscore >= -0.6) {
    return "./assets/images/negative-medium.png";
  } else if (goodnewsscore >= -1.0) {
    return "./assets/images/negative-high.png";
  }
};

//var pageRedirect = function (reDirectPage) {
//      window.location.href = "https://www.tutorialrepublic.com/";
//};

var generateNewsArticles = function (news) {
  console.log("startiing to generate news articles");

  $("#news-article-list").empty();

  var resultsArray = [];

  for (i = 0; i < news.length; i++) {
    var newsImageUrl = news[i].image;
    var sentimentUrl = convertGoodnewsScoreToIcon(news[i].good_news_score);
    var newsTitle = news[i].title;
    var linkUrl = news[i].url;

    //console.log(">>> item " + i);
    //console.log("    title -> " + newsTitle);
    //console.log("    imageUrl -> " + newsImageUrl);
    //console.log("    sentimentUrl -> " + sentimentUrl);
    //console.log("    linkUrl -> " + linkUrl);

    var newsItem = $("<li>")
      .addClass("news-item")
      //.attr("onclick", "location.href='" + linkUrl + "'")
      //.attr("target", "_blank");
      .attr("onclick", "window.open('" + linkUrl + "', '_blank');return false;")
      .attr("href", "javascript:void(0);");

    var article = $("<div>").addClass("article");

    var newsTitle = $("<p>").addClass("news-title").text(newsTitle);

    // don't include an image if the image url is None
    var includeNewsImage = false;
    var newsImage;
    if (!newsImageUrl.includes("None")) {
      includeNewsImage = true;
      newsImage = $("<img>")
        .addClass("news-image")
        .attr("src", newsImageUrl)
        .width("100px")
        .height("55px");
    }

    var sentimentImage = $("<img>")
      .addClass("sentiment-image")
      .width("30px")
      .height("30px")
      .attr("src", sentimentUrl);

    // put sentiment Image, articleTitle & articleImage (if it exists) in article
    article.append(sentimentImage);
    article.append(newsTitle);

    if (includeNewsImage) {
      article.append(newsImage);
    }

    newsItem.append(article);

    $("#news-article-list").append(newsItem);
  }
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

    var categoryQuery = categoryArray.join("+");

    console.log("categories -> " + categoryQuery);

    getNews(currentsApi.getCategoryQuery(categoryQuery))
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

////------------------------------------------------------
////
////  SCREEN UPDATE SECTION START
////
////   functions to control the state of the search results area
////------------------------------------------------------

var showWaitingForUserAction = function () {
  $("#waiting-for-user-action").show();
  $("#waiting-for-news-animation-holder").hide();
  $("#news-article-list").hide();
  $("#search-returned-error").hide();
};

var showWaitingForNews = function () {
  $("#waiting-for-user-action").hide();
  $("#waiting-for-news-animation-holder").show();
  $("#news-article-list").hide();
  $("#search-returned-error").hide();
};

var showNewsResultsSuccess = function () {
  $("#waiting-for-user-action").hide();
  $("#waiting-for-news-animation-holder").hide();
  $("#news-article-list").show();
  $("#search-returned-error").hide();
};

var showNewsResultsError = function () {
  $("#waiting-for-user-action").hide();
  $("#waiting-for-news-animation-holder").hide();
  $("#news-article-list").hide();
  $("#search-returned-error").show();
};

//// -----------------------------------------------------
////
////  GET NEWS BUTTON HANDLER SECTION
////
////  these functions use the api calls to get current news
////
//// -----------------------------------------------------

var newsCurrentButtonClicked = function () {
  console.log("============================");
  console.log(
    "news button clicked.  Here is where we want to turn on the animation."
  );
  //Here is where we want to turn on the animation
  showWaitingForNews();

  getCurrentNewsAndSentiment()
    .then(function (news) {
      console.log("return from getCurrentNewsAndSentiment with news");
      console.log(news);
      generateNewsArticles(news);
      showNewsResultsSuccess();
      console.log("============================");
    })
    .catch(function (error) {
      console.log("return from getCurrentNewsAndSentiment with error");
      console.log(error);
      showNewsResultsError();
      console.log("============================");
    });
};

var newsKeywordSearchClicked = function () {
  console.log("=========================================");
  console.log("newsKeywordSearchClicked");

  var keywordSearch = $("#search-keyword-input").val();

  showWaitingForNews();
  getCurrentNewsAndSentimentFromApiByKeyword(keywordSearch)
    .then(function (news) {
      console.log(news);
      generateNewsArticles(news);
      showNewsResultsSuccess();
      console.log("newsKeywordSearchClicked SUCCESS");
      console.log("=========================================");
    })
    .catch(function (error) {
      console.log(error);
      showNewsResultsError();
      console.log("newsKeywordSearchClicked ERROR");
      console.log("=========================================");
    });
};

var newsMultiCategorySearchClicked = function () {
  console.log("=========================================");
  console.log("newsMultiCategorySearchClicked");

  showWaitingForNews();

  //get values from category select
  var categoriesSelected = $(".search-category-options").select2("data");
  console.log("   searching for " + categoriesSelected.length + " categories");

  var categoryArray = [];
  for (var i = 0; i < categoriesSelected.length; i++) {
    categoryArray.push(categoriesSelected[i].text);
  }

  // remove all values frmo category select (reset the users selection)
  $(".search-category-options").val(null).trigger("change");

  getCurrentNewsAndSentimentFromApiByCategory(categoryArray)
    .then(function (news) {
      console.log(news);
      generateNewsArticles(news);
      showNewsResultsSuccess();
      console.log("newsMultiCategorySearchClicked SUCCESS");
      console.log("=========================================");
    })
    .catch(function (error) {
      console.log(error);
      showNewsResultsError();
      console.log("newsMultiCategorySearchClicked ERROR");
      console.log("=========================================");
    });
};

var simulateError = function () {
  return new Promise(function (resolve, reject) {
    //wait 5 seconds, then reject with an error
    setTimeout(
      reject,
      5000,
      getErrorStatus("Simulated Error", "This was a simulated error")
    );
  });
};

var newsForceErrorClicked = function () {
  console.log("=========================================");
  console.log("newsForceErrorClicked");

  showWaitingForNews();

  simulateError()
    .then(function () {
      //this will never happen
    })
    .catch(function (error) {
      console.log("...error returned!");
      showNewsResultsError();
    })
    .finally(function () {
      console.log("=========================================");
    });
};

/// need to hide the news-roll animation on first load

//////////////////////
////
////   SETUP OUR EVENT HANDLERS & PAGE INITIALIZATION
////
///////////////////////

/// SETUP AND INITIALIZE CURRENT NEWS SEARCH
showWaitingForUserAction();

// get news button is clicked
$("#search-current-news-button").on("click", newsCurrentButtonClicked);

/// SETUP AND INTIALIZE KEYWORD SEARCH

// keyword search is clicked
$("#search-keyword-button").on("click", newsKeywordSearchClicked);

// disable the keyword search button initially
$("#search-keyword-button").prop("disabled", true);

// setup the onkeyup handler for the keyword input
$("#search-keyword-input").on("keyup", function () {
  var keywordSearch = $("#search-keyword-input").val();
  if (keywordSearch && keywordSearch.length > 0) {
    $("#search-keyword-button").prop("disabled", false);
  } else {
    $("#search-keyword-button").prop("disabled", true);
  }
});

//// SETUP AND INITALIZE CATEGORY SEARCH

$("#search-by-categories-button").on("click", newsMultiCategorySearchClicked);

//we want to wait to initialize the select2 library for the category search
//until after the document has finished loading
$(document).ready(function () {
  $(".search-category-options").select2({
    placeholder: "select one or more categories...",
    width: "100%",
  });

  // disable the category selection button
  $("#search-by-categories-button").prop("disabled", true);

  // bind a function to check if we should enable or disable the button every time the category select box changes
  $(".search-category-options").on("change", function (e) {
    var categoriesSelected = $(".search-category-options").select2("data");
    if (categoriesSelected && categoriesSelected.length > 0) {
      $("#search-by-categories-button").prop("disabled", false);
    } else {
      $("#search-by-categories-button").prop("disabled", true);
    }
  });
});

/// SETUP AND INITIALISE FORCE ERROR SEARCH
$("#search-force-error-button").on("click", newsForceErrorClicked);
