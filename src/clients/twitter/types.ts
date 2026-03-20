export interface TwitterUser {
  creation_date: string;
  user_id: string;
  username: string;
  name: string;
  follower_count: number;
  following_count: number;
  favourites_count: number;
  is_private: boolean;
  is_verified: boolean;
  is_blue_verified: boolean;
  location: string;
  profile_pic_url: string;
  profile_banner_url: string | null;
  description: string;
  external_url: string | null;
  number_of_tweets: number;
  bot: boolean;
  timestamp: number;
  has_nft_avatar: boolean;
  category: string | null;
  default_profile: boolean;
  default_profile_image: boolean;
  listed_count: number;
  verified_type: string | null;
}

export interface VideoVariant {
  bitrate?: number;
  content_type: string;
  url: string;
}

export interface Tweet {
  tweet_id: string;
  creation_date: string;
  text: string;
  media_url: string[];
  video_url: VideoVariant[] | null;
  user: TwitterUser;
  language: string;
  favorite_count: number;
  retweet_count: number;
  reply_count: number;
  quote_count: number;
  retweet: boolean;
  views: number;
  timestamp: number;
  video_view_count: number | null;
  in_reply_to_status_id: string | null;
  quoted_status_id: string | null;
  binding_values: unknown[] | null;
  expanded_url: string | null;
  retweet_tweet_id: string | null;
  extended_entities: unknown | null;
  conversation_id: string;
  retweet_status: unknown | null;
  quoted_status: unknown | null;
  bookmark_count: number;
  source: string;
  community_note: unknown | null;
}

export interface TwitterSearchResponse {
  results: Tweet[];
  continuation_token: string | null;
}
