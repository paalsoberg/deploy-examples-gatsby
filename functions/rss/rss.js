const https = require("https");

function addLeadingZero(num) {
  num = num.toString();
  while (num.length < 2) num = "0" + num;
  return num;
}

// See https://github.com/whitep4nth3r/rfc-822
// and https://whitep4nth3r.com/blog/how-to-format-dates-for-rss-feeds-rfc-822/

function buildRFC822Date(dateString) {
  const dayStrings = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthStrings = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const timeStamp = Date.parse(dateString);
  const date = new Date(timeStamp);

  const day = dayStrings[date.getDay()];
  const dayNumber = addLeadingZero(date.getDate());
  const month = monthStrings[date.getMonth()];
  const year = date.getFullYear();
  const time = `${addLeadingZero(date.getHours())}:${addLeadingZero(date.getMinutes())}:00`;
  const timezone = date.getTimezoneOffset() === 0 ? "GMT" : "BST";

  //Wed, 02 Oct 2002 13:00:00 GMT
  return `${day}, ${dayNumber} ${month} ${year} ${time} ${timezone}`;
}

async function getPosts() {
  return new Promise((resolve, reject) => {
    const query = `
    query {
      blogPost {
        items {
          sys {
            firstPublishedAt
            id
          }
          title
          slug
          description
          Tags
        }
      }
    }
    `;

    const options = {
      protocol: "https:",
      hostname: "graphql.contentful.com",
      path: "/content/v1/spaces/8i2o0d5rt6lt",
      method: "POST",
      headers: {
        Authorization: "Bearer iDKYaTcW6L7ZowuIW_hYLdzQXCWucUYcmFavAl1gXR0",
        "Content-Type": "application/json",
      },
    };

    let posts = "";

    const req = https.request(options, (res) => {
      res.on("data", (data) => {
        posts += data;
      });

      res.on("end", () => {
        const parsedPosts = JSON.parse(posts);
        resolve(parsedPosts.data.microblogCollection.items);
      });
    });

    req.on("error", (e) => {
      console.error(e);
    });

    req.write(JSON.stringify({ query }));
    req.end();
  });
}

function buildRssItems(items) {
  const truncateLength = 44;

  return items
    .map((item) => {
      const hasText = item.title;
      const hasLink = item.slug;
      const titleMaybeTruncated = hasText && item.text.length > truncateLength ? "..." : "";
      const title = hasText
        ? `${item.text.slice(0, truncateLength)}${titleMaybeTruncated}`
        : "New post";
      const maybeLink = hasLink ? ` - ${item.link}` : "";
      const description = hasText ? `${item.text}${maybeLink}` : "";

      return `
        <item>
        <title>${title}</title>
        <description>${description}</description>
        <author>paal.soberg@klevu.com (Klevu)</author>
        <link>https://elaborate-pegasus-69af84.netlify.app#${item.sys.id}</link>
        <guid>https://elaborate-pegasus-69af84.netlify.app#${item.sys.id}</guid>
        <pubDate>${buildRFC822Date(item.sys.firstPublishedAt)}</pubDate>
        </item>
        `;
    })
    .join("");
}

exports.handler = async function (event, context) {
  const rssFeed = `<?xml version="1.0"?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Klevu Contentful XML test</title>
    <atom:link href="https://elaborate-pegasus-69af84.netlify.app/.netlify/functions/rss" rel="self" type="application/rss+xml" />
    <link>https://thingoftheday.xyz</link>
    <description>thingoftheday is a lightweight microblogging site powered by Contentful and vanilla HTML, CSS and JavaScript.</description>
    ${buildRssItems(await getPosts())}
  </channel>
  </rss>`;

  return {
    statusCode: 200,
    contentType: "text/xml",
    body: rssFeed,
  };
};