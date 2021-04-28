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

// variable to hold parallel dots api info
var parallelDots = {
  apiKey: "7ES25jNlQY5RISQu4JW2SuFWC6w6QWobpHxoOuuBPLk",
  url: "https://apis.paralleldots.com/v4/sentiment",

  getSentimentQuery: function () {
    return this.url;
  },

  getSentimentParameters: function (queryText) {
    var fetchOptions = {};
    fetchOptions.method = "POST";
    //fetchOptions.headers = {
    //  "Content-type": "application/json; charset=UTF-8",
    //};
    //fetchOptions.query = {};

    //fetchOptions.query.text = JSON.stringify(queryText);
    //fetchOptions.query.text = "Mary had a little lamb";

    //fetchOptions.query.api_key = this.apiKey;
    //fetchOptions.query.lang_code = "en";

    var formData = new FormData();
    formData.append("text", JSON.stringify(queryText));
    formData.append("api_key", this.apiKey);
    formData.append("lang_code", "en");

    fetchOptions.body = formData;

    return fetchOptions;
  },
};

var getSentimentForTextString = async function (queryText) {
  // returns a sentiment array for the given query text
  var sentimentUrl = parallelDots.getSentimentQuery();
  var sentimentOptions = parallelDots.getSentimentParameters(queryText);

  await fetch(sentimentUrl, sentimentOptions).then(function (
    sentimentResponse
  ) {
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

  var mediaUrl = mediaStack.getCurrentNewsQuery();
  console.log("    going to fetch -> " + mediaUrl);

  fetch(mediaUrl).then(function (response) {
    if (response.ok) {
      // we got the data
      response.json().then(function (responseData) {
        console.log("------- News Data ---------");
        console.log(responseData);
        console.log("---------------------------");

        // now get an array of descriptions, to send for sentiment analysis
        var textArray = getNewsDescriptionArray(responseData.data);
        //console.log("------- Text Array --------");
        //console.log(textArray);
        //console.log("---------------------------");

        // now get sentiment of each item
        sentimentResults = [];
        textArray.forEach(function (textItem) {
          var thisResult = {};
          thisResult.queryText = textItem;
          thisResult.sentiment = getSentimentForTextString(textItem);
        });
      });
    } else {
      console.log(
        "   ...had a problem with news fetch, response status -> " +
          response.statusText
      );
    }
  });
};

// get news button is clicked
$("#news-button").on("click", getNews);
