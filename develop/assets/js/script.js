////------------------------------------------------------
////  API SECTION
////
////  This section of code implements API functionality
////
////
//// ------------------------------------------------------

// array to hold sentiment results
var sentimentResults = [];

// variable to hold media stack api info
var mediaStack = {
  apiKey: "afb878e1a1d59a5a7767169581962ec9",
  url: "http://api.mediastack.com/v1/",

  getCurrentNewsQuery: function () {
    return (
      this.url +
      "news?access_key=" +
      this.apiKey +
      "&languages=en&countries=us&limit=25"
    );
  },
};

var currentsApi = {
  apiKey: "pqlXoMwbO6xGnewLW6Hf_tECeZ-U2u5T8E8u-SE-XwoCEdYO",
  url: "https://api.currentsapi.services/v1/latest-news?language=en&apiKey=",

  getCurrentNewsQuery: function () {
    return this.url + this.apiKey;
  },
};

// variable to hold parallel dots api info
var parallelDots = {
  apiKey: "7ES25jNlQY5RISQu4JW2SuFWC6w6QWobpHxoOuuBPLk",
  url: "https://apis.paralleldots.com/v4/sentiment",
  bulkUrl: "https://apis.paralleldots.com/v4/sentiment_batch",

  getSentimentQuery: function () {
    return this.url;
  },

  getSentimentBulkQuery: function () {
    return this.bulkUrl;
  },

  getSentimentParametersBulk: function (arrayText) {
    var fetchOptions = {};
    fetchOptions.method = "POST";

    var formData = new FormData();
    formData.append("text", JSON.stringify(arrayText));
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

var getSentimentForTextString = function (queryText) {
  // returns a sentiment array for the given query text
  var sentimentUrl = parallelDots.getSentimentQuery();
  var sentimentOptions = parallelDots.getSentimentParameters(queryText);

  fetch(sentimentUrl, sentimentOptions).then(function (sentimentResponse) {
    if (sentimentResponse.ok) {
      sentimentResponse.json().then(function (sentimentData) {
        console.log("----- Query Text ------");
        console.log(queryText);
        console.log(sentimentData.sentiment);
        console.log("---------------------------");
        return sentimentData.sentiment;
      });
    } else {
      // had a problem
      console.log("----- Query Text ------");
      console.log(queryText);
      console.log(
        "   ERROR -> response status -> " + sentimentResponse.statusText
      );
      console.log("---------------------------");
      // return empty sentiment data;
      var sentimentResult = {};
      sentimentResult.positive = 0.0;
      sentimentResult.negative = 0.0;
      sentimentResult.neutral = 0.0;

      return sentimentResult;
    }
  });
};

var getSentimentBulk = function (textArray) {
  var sentimentUrl = parallelDots.getSentimentBulkQuery();
  var sentimentOptions = parallelDots.getSentimentParametersBulk(textArray);

  console.log("getSentimentBulk START...");

  fetch(sentimentUrl, sentimentOptions).then(function (sentimentResponse) {
    if (sentimentResponse.ok) {
      sentimentResponse.json().then(function (sentimentData) {
        console.log("----- Query Text ------");
        console.log("   " + textArray.length + " items");
        console.log("----- Sentiment Data ------");
        console.log(sentimentData.sentiment);
        console.log("---------------------------");
        return sentimentData.sentiment;
      });
    } else {
      // had a problem
      console.log("----- Query Text ------");
      console.log("   " + textArray.length + " items");
      console.log(
        "   ERROR -> response status -> " + sentimentResponse.statusText
      );
      console.log("---------------------------");
      // return empty sentiment data;
      var sentimentResult = {};
      sentimentResult.positive = 0.0;
      sentimentResult.negative = 0.0;
      sentimentResult.neutral = 0.0;

      return sentimentResult;
    }
  });
};

var getSentimentByIteration = function (textArray) {
  textArray.forEach(function (textItem) {
    var thisResult = {};
    thisResult.queryText = textItem;
    thisResult.sentiment = getSentimentForTextString(textItem);
  });
};

var getNewsDescriptionArray = function (newsDataArray) {
  // take the news data array, and build an array of the descriptions
  var textArray = [];

  newsDataArray.forEach((newsItem) => {
    textArray.push(newsItem.title);
  });

  console.log("   created a textArray with " + textArray.length + " items");
  return textArray;
};

// gets the current news
var getNews = function () {
  console.log("getNews START...");

  //var mediaUrl = mediaStack.getCurrentNewsQuery();
  var mediaUrl = currentsApi.getCurrentNewsQuery();

  console.log("    going to fetch -> " + mediaUrl);

  fetch(mediaUrl).then(function (response) {
    if (response.ok) {
      // we got the data
      response.json().then(function (responseData) {
        console.log("------- News Data ---------");
        console.log(responseData);
        console.log("---------------------------");

        // now get an array of descriptions, to send for sentiment analysis
        var textArray = getNewsDescriptionArray(responseData.news);
        //console.log("------- Text Array --------");
        //console.log(textArray);
        //console.log("---------------------------");

        // now get sentiment of each item
        sentimentResults = [];

        //getSentimentByIteration(textArray);
        getSentimentBulk(textArray);
      });
    } else {
      console.log(
        "   ...had a problem with news fetch, response status -> " +
          response.statusText
      );
    }
  });
};

/// this is master api call
var getCurrentNewsAndSentimentFromApi = function() {
  console.log("getCurrentNewsAndSentimentFromApi");

},

// get news button is clicked
$("#news-button").on("click", getNews);
