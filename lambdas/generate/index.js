/**
 * Lambda Function: generate
 *
 * This function initiates the image generation generation process
 * by making a POST request to the Replicate API.
 *
 * Input:
 * - event.body: Contains parameters for the prediction process.
 *   {
 *     motion_module,
 *     prompt,
 *     negativePrompt,
 *     path,
 *     inferenceStep,
 *     guidance,
 *     seed
 *   }
 *
 * Output:
 * - Success: Returns a status 'polling' with a URL to poll for the result.
 * - Error: Returns an error status and message.
 *
 * Dependencies:
 * - Replicate API
 *
 * Rate Limiting:
 * - The function uses a rate limiter to control the number of requests.
 * - The rate limiter allows 10 requests per 10 minutes.
 * - If the rate limit is exceeded, the function returns an error with status code 429 (Too Many Requests).
 *
 * Error Handling:
 * - Returns appropriate error messages based on the Replicate API response or any internal errors.
 */

import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import redis from "./utils/redis.js";

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";
const MODEL_VERSION =
  "beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f";

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create a new ratelimiter, that allows 30 requests per 10 minutes
// Create a new ratelimiters for each subscription tier
const ratelimits = {
  free: new Ratelimit({
    redis,
    analytics: true,
    prefix: "ratelimit:free",
    limiter: Ratelimit.slidingWindow(10, "5 m"),
  }),
  starter: new Ratelimit({
    redis,
    analytics: true,
    prefix: "ratelimit:starter",
    limiter: Ratelimit.slidingWindow(5, "10 m"),
  }),
  pro: new Ratelimit({
    redis,
    analytics: true,
    prefix: "ratelimit:pro",
    limiter: Ratelimit.slidingWindow(20, "5 m"),
  }),
  psycho: new Ratelimit({
    redis,
    analytics: true,
    prefix: "ratelimit:psycho",
    limiter: Ratelimit.slidingWindow(50, "5 m"),
  }),
};

// Mapping of subscription tier ids to ratelimit keys
const subscriptionTierToRateLimitKey = {
  price_1NuJ60Lr4ehzJMlIGSSNFUHY: "psycho",
  price_1NuJ5xLr4ehzJMlIZ0p87pNK: "pro",
  price_1NuJ5qLr4ehzJMlI27gBJqye: "starter",
};

const makeRequest = async (input) => {
  try {
    return await fetch(REPLICATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Token " + process.env.REPLICATE_API_KEY,
      },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input,
      }),
    });
  } catch (error) {
    console.error("Error making request:", error);
    return null;
  }
};

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const req = JSON.parse(event.body);
    console.log("req ", JSON.stringify(req, null, 2));
    const {
      motion_module,
      path,
      prompt,
      negativePrompt,
      inferenceStep,
      guidance,
      seed,
      userId,
      subscription_tier,
    } = req;

    // Get the user's current credits
    const { data: user, error: getUserError } = await supabaseAdmin
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();

    if (getUserError) {
      console.error("Error getting user:", getUserError);
      throw new Error("Error getting user");
    }

    // Check if the user has sufficient credits
    if (user.credits <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          status: "error",
          message: "You have insufficient credits.",
        }),
      };
    }

    // Use a constant string to limit all requests with a single ratelimit // Or use a userID, apiKey or ip address for individual limits.
    const identifier = subscription_tier ? "ip address" : userId; // Select the appropriate rate limiter based on the subscription tier
    const ratelimiter =
      ratelimits[subscriptionTierToRateLimitKey[subscription_tier]] ||
      ratelimits.free;
    console.log("subscription tier", ratelimiter.prefix);

    const { success } = await ratelimiter.limit(identifier);

    if (!success) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          status: "error",
          message: "You've exceeded your tier limit. Please try again later.",
        }),
      };
    }

    // POST request to Replicate to start the image restoration generation process
    let startResponse = null;
    const input = {
      motion_module,
      path,
      prompt,
      n_prompt: negativePrompt,
      steps: inferenceStep,
      guidance_scale: guidance,
      seed,
    };

    startResponse = await makeRequest(input);

    if (!startResponse.ok) {
      throw new Error(`HTTP error! status: ${startResponse.statusText}`);
    }

    let jsonStartResponse = await startResponse.json();
    let endpointUrl = jsonStartResponse.urls.get;

    // Return immediately with a "polling" status and the URL to poll for the result
    if (endpointUrl) {
      // Deduct one credit from the user
      const newCredits = (user.credits || 0) - 1;
      const { error: updateUserError } = await supabaseAdmin
        .from("users")
        .update({ credits: newCredits })
        .eq("id", userId);

      if (updateUserError) {
        console.error("Error deducting user credits:", updateUserError);
        throw new Error("Error deducting user credits");
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: "polling",
          url: endpointUrl,
        }),
      };
    } else {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          status: "error",
          message: "Endpoint URL is not available.",
        }),
      };
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        status: "error",
        message: error.message,
      }),
    };
  }
};
