# BuzzAssetType | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/BuzzAssetType/
scraped_at: 2025-12-22T03:30:34.040Z
---

On this page

```
type BuzzAssetType =  | 'CUSTOM'  | 'TWITTER_POST'  | 'LINKEDIN_POST'  | 'INSTA_POST_SQUARE'  | 'INSTA_POST_PORTRAIT'  | 'INSTA_STORY'  | 'INSTA_AD'  | 'FACEBOOK_POST'  | 'FACEBOOK_COVER_PHOTO'  | 'FACEBOOK_EVENT_COVER'  | 'FACEBOOK_AD_PORTRAIT'  | 'FACEBOOK_AD_SQUARE'  | 'PINTEREST_AD_PIN'  | 'TWITTER_BANNER'  | 'LINKEDIN_POST_SQUARE'  | 'LINKEDIN_POST_PORTRAIT'  | 'LINKEDIN_POST_LANDSCAPE'  | 'LINKEDIN_PROFILE_BANNER'  | 'LINKEDIN_ARTICLE_BANNER'  | 'LINKEDIN_AD_LANDSCAPE'  | 'LINKEDIN_AD_SQUARE'  | 'LINKEDIN_AD_VERTICAL'  | 'YOUTUBE_THUMBNAIL'  | 'YOUTUBE_BANNER'  | 'YOUTUBE_AD'  | 'TWITCH_BANNER'  | 'GOOGLE_LEADERBOARD_AD'  | 'GOOGLE_LARGE_AD'  | 'GOOGLE_MED_AD'  | 'GOOGLE_MOBILE_BANNER_AD'  | 'GOOGLE_SKYSCRAPER_AD'  | 'CARD_HORIZONTAL'  | 'CARD_VERTICAL'  | 'PRINT_US_LETTER'  | 'POSTER'  | 'BANNER_STANDARD'  | 'BANNER_WIDE'  | 'BANNER_ULTRAWIDE'  | 'NAME_TAG_PORTRAIT'  | 'NAME_TAG_LANDSCAPE'  | 'INSTA_REEL_COVER'  | 'ZOOM_BACKGROUND'
```

Represents the different types of media assets and formats supported in Figma Buzz. These asset types correspond to specific platform requirements and dimensions, ensuring content is optimized for each media platform.

BuzzAssetType is used with [`setBuzzAssetTypeForNode`](/docs/plugins/api/properties/figma-buzz-setbuzzassettypefornode/) and [`getBuzzAssetTypeForNode`](/docs/plugins/api/properties/figma-buzz-getbuzzassettypefornode/) to manage content categorization.

## Platform Categories[​](#platform-categories "Direct link to Platform Categories")

### Twitter/X[​](#twitterx "Direct link to Twitter/X")

*   `TWITTER_POST` - Standard Twitter post format (1200×675px)
*   `TWITTER_BANNER` - Twitter profile banner (1500×500px)

### LinkedIn[​](#linkedin "Direct link to LinkedIn")

*   `LINKEDIN_POST` - Standard LinkedIn post (1200×1200px)
*   `LINKEDIN_POST_SQUARE` - Square LinkedIn post (1080×1080px)
*   `LINKEDIN_POST_PORTRAIT` - Portrait LinkedIn post (626×1200px)
*   `LINKEDIN_POST_LANDSCAPE` - Landscape LinkedIn post (1200×626px)
*   `LINKEDIN_PROFILE_BANNER` - LinkedIn profile banner (1584×396px)
*   `LINKEDIN_ARTICLE_BANNER` - LinkedIn article header (1920×1080px)
*   `LINKEDIN_AD_LANDSCAPE` - LinkedIn landscape advertisement (1200×628px)
*   `LINKEDIN_AD_SQUARE` - LinkedIn square advertisement (1200×1200px)
*   `LINKEDIN_AD_VERTICAL` - LinkedIn vertical advertisement (720×900px)

### Instagram[​](#instagram "Direct link to Instagram")

*   `INSTA_POST_SQUARE` - Square Instagram post (1080×1080px)
*   `INSTA_POST_PORTRAIT` - Portrait Instagram post (1080×1350px)
*   `INSTA_STORY` - Instagram story format (1080×1920px)
*   `INSTA_AD` - Instagram advertisement (1440×1440px)
*   `INSTA_REEL_COVER` - Instagram Reel cover image (1080×1920px)

### Facebook[​](#facebook "Direct link to Facebook")

*   `FACEBOOK_POST` - Standard Facebook post (1200×630px)
*   `FACEBOOK_COVER_PHOTO` - Facebook cover photo (851×315px)
*   `FACEBOOK_EVENT_COVER` - Facebook event cover (1920×1005px)
*   `FACEBOOK_AD_PORTRAIT` - Facebook portrait advertisement (1440×1800px)
*   `FACEBOOK_AD_SQUARE` - Facebook square advertisement (1440×1440px)

### YouTube[​](#youtube "Direct link to YouTube")

*   `YOUTUBE_THUMBNAIL` - YouTube video thumbnail (1280×720px)
*   `YOUTUBE_BANNER` - YouTube channel banner (2560×1440px)
*   `YOUTUBE_AD` - YouTube advertisement (300×60px)

### Other Platforms[​](#other-platforms "Direct link to Other Platforms")

*   `PINTEREST_AD_PIN` - Pinterest advertising pin (1000×1500px)
*   `TWITCH_BANNER` - Twitch channel banner (1200×480px)
*   `ZOOM_BACKGROUND` - Zoom virtual background (1920×1080px)

### Google Ads[​](#google-ads "Direct link to Google Ads")

*   `GOOGLE_LEADERBOARD_AD` - Google leaderboard advertisement (728×90px)
*   `GOOGLE_LARGE_AD` - Google large rectangle advertisement (336×280px)
*   `GOOGLE_MED_AD` - Google medium rectangle advertisement (300×250px)
*   `GOOGLE_MOBILE_BANNER_AD` - Google mobile banner advertisement (300×50px)
*   `GOOGLE_SKYSCRAPER_AD` - Google skyscraper advertisement (160×600px)

### Print & Generic Formats[​](#print--generic-formats "Direct link to Print & Generic Formats")

*   `CARD_HORIZONTAL` - Horizontal card format (504×360px)
*   `CARD_VERTICAL` - Vertical card format (360×504px)
*   `PRINT_US_LETTER` - US Letter print format (612×792px)
*   `POSTER` - Poster format (648×864px)
*   `BANNER_STANDARD` - Standard banner (576×288px)
*   `BANNER_WIDE` - Wide banner (576×192px)
*   `BANNER_ULTRAWIDE` - Ultra-wide banner (576×144px)
*   `NAME_TAG_PORTRAIT` - Portrait name tag (144×216px)
*   `NAME_TAG_LANDSCAPE` - Landscape name tag (216×144px)
*   `CUSTOM` - Custom asset type for non-standard formats (1080×1080px)

## Usage Example[​](#usage-example "Direct link to Usage Example")

```
// Set a node as a specific asset typefigma.buzz.setBuzzAssetTypeForNode(selectedNode, 'INSTAGRAM_STORY');// Check the current asset typeconst assetType = figma.buzz.getBuzzAssetTypeForNode(selectedNode);switch (assetType) {  case 'TWITTER_POST':    // Handle Twitter post specific logic    break;  case 'LINKEDIN_POST_SQUARE':    // Handle LinkedIn square post logic    break;  case 'INSTA_STORY':    // Handle Instagram story logic    break;  default:    // Handle other asset types or null    break;}// Filter nodes by asset typeconst twitterAssets = selection.filter(node =>  figma.buzz.getBuzzAssetTypeForNode(node) === 'TWITTER_POST');
```

Each asset type ensures that content is properly sized and formatted for its target platform, making it easier to create platform-specific media content programmatically.

*   [Platform Categories](#platform-categories)
    *   [Twitter/X](#twitterx)
    *   [LinkedIn](#linkedin)
    *   [Instagram](#instagram)
    *   [Facebook](#facebook)
    *   [YouTube](#youtube)
    *   [Other Platforms](#other-platforms)
    *   [Google Ads](#google-ads)
    *   [Print & Generic Formats](#print--generic-formats)
*   [Usage Example](#usage-example)
