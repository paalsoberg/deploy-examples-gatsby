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
      blogPostCollection {
        items {
          sys {
            firstPublishedAt
            id
          }
          title
          slug
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
        "Authorization": "Bearer VGGwjo1_NjJCjS3jhAfs0d-ocgF8J-Ze7HKEL2ZORyk",
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
        resolve(parsedPosts.data.blogPostCollection.items);
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
      const title = item.title;
      const description = item.description.json.content;
      const link = item.slug;
      const id = item.sys.id;
      
      return `
        <item>
        <id>${id}</id>
        <item_type>KLEVU_CMS</item_type>
        <title>${title}</title>
        <description>${description}</description>
        <link>https://elaborate-pegasus-69af84.netlify.app/blog/${link}</link>
        <published_at>${buildRFC822Date(item.sys.firstPublishedAt)}</published_at>
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
    <link>https://klevu.com</link>
    <description>This is a sample feed for Contentful to send cms content to Klevu</description>
    ${buildRssItems(await getPosts())}
  </channel>
  </rss>`;

  return {
    statusCode: 200,
    contentType: "text/xml",
    body: rssFeed,
  };
};