package khiem.twitter.demo;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;

import org.scribe.builder.ServiceBuilder;
import org.scribe.builder.api.TwitterApi;
import org.scribe.model.OAuthRequest;
import org.scribe.model.Response;
import org.scribe.model.Token;
import org.scribe.model.Verb;
import org.scribe.oauth.OAuthService;

/**
 * Hello world!
 *
 */
public class TwitterStreaming {
  public static void main(String[] args) {
    /*AbstractHttpClient client = new DefaultHttpClient();
    String url = "https://sitestream.twitter.com/1.1/site.json?follow=6253282";
    client.getAuthSchemes().register(OAuthSchemeFactory.SCHEME_NAME, new OAuthSchemeFactory());
    HttpGet request = new HttpGet(url);
    HttpResponse response;
    try {
      response = client.execute(request);
    
    
      // Get the response
      BufferedReader rd = new BufferedReader
        (new InputStreamReader(response.getEntity().getContent()));
          
      String line = "";
      while ((line = rd.readLine()) != null) {
        System.out.println(line);
      } 
    } catch (IOException e) {
      e.printStackTrace();
    }*/
    
    OAuthService service = new ServiceBuilder()
      .provider(TwitterApi.class)
      .apiKey("cJIc5ji9EMQDX3XT1fqZg")
      .apiSecret("KOZhtQAfjw8D2pDTTCWRLbQYB4hVJ0dvBoMSWPmAY")
      .build();

    /*Scanner in = new Scanner(System.in);
    
    System.out.println("=== Twitter's OAuth Workflow ===");
    System.out.println();

    // Obtain the Request Token
    System.out.println("Fetching the Request Token...");
    Token requestToken = service.getRequestToken();
    System.out.println("Got the Request Token!");
    System.out.println();

    System.out.println("Now go and authorize Scribe here:");
    System.out.println(service.getAuthorizationUrl(requestToken));
    System.out.println("And paste the verifier here");
    System.out.print(">>");
    Verifier verifier = new Verifier(in.nextLine());
    System.out.println();

    // Trade the Request Token and Verfier for the Access Token
    System.out.println("Trading the Request Token for an Access Token...");
    Token accessToken = service.getAccessToken(requestToken, verifier);
    System.out.println("Got the Access Token!");
    System.out.println("(if your curious it looks like this: " + accessToken + " )");
    System.out.println();*/
    
    Token accessToken = new Token("557374910-1Y5JqEllS2tR5nFnBMfdJy6XFodY9bH7W8n6nWgI", "TgSZBpkDXFFS5DTjn3tcVuTSpfxruefF6NaEm68k9DY");
    OAuthRequest request = new OAuthRequest(Verb.GET, "https://api.twitter.com/1.1/account/verify_credentials.json");
    //request.addBodyParameter("status", "this is sparta! *");
    service.signRequest(accessToken, request);
    Response response = request.send();
    System.out.println("Got it! Lets see what we found...");
    System.out.println();
    System.out.println(response.getBody());
    
    String url = "https://sitestream.twitter.com/1.1/site.json?follow=557374910";
    request = new OAuthRequest(Verb.GET, url);
    service.signRequest(accessToken, request);
    response = request.send();
    BufferedReader reader = new BufferedReader(new InputStreamReader(response.getStream()));
    String line;
    try {
      while ((line = reader.readLine()) != null) {
        System.out.println(line);
      }
    } catch (IOException e) {
      e.printStackTrace();
    }
  }
  
  
}
