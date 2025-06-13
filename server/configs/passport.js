import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import axios from "axios";
import Admin from "../models/Admin.js";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
  console.error('Missing required Google OAuth environment variables');
  process.exit(1);
}
if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET || !process.env.LINKEDIN_CALLBACK_URL) {
  console.error('Missing LinkedIn OAuth environment variables');
  process.exit(1);
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, _refreshToken, profile, done) => {
      try {
        if (!profile.emails || !profile.emails[0]) {
          return done(new Error('No email found in Google profile'), null);
        }
        let admin = await Admin.findOne({ email: profile.emails[0].value });

        if (!admin) {
          return done(null, { profile, isNew: true });
        }

        return done(null, admin);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

class LinkedInStrategy extends OAuth2Strategy {
  constructor(options, verify) {
    const linkedinOptions = {
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      clientID: options.clientID,
      clientSecret: options.clientSecret,
      callbackURL: options.callbackURL,
    };

    super(linkedinOptions, verify);
    this.name = 'linkedin';
    this._oauth2.useAuthorizationHeaderforGET(true);
  }

  async userProfile(accessToken, done) {
    try {
      console.log('Fetching LinkedIn profile...');
      let profileData, email;
      
      try {
        const userinfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });
        
        profileData = userinfoResponse.data;
        email = profileData.email;
        console.log('LinkedIn userinfo response:', profileData);
        
      } catch (userinfoError) {
        console.log('Userinfo endpoint failed, trying legacy endpoints...');
        
        const [profileResponse, emailResponse] = await Promise.all([
          axios.get('https://api.linkedin.com/v2/people/~', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'X-Restli-Protocol-Version': '2.0.0'
            }
          }),
          axios.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'X-Restli-Protocol-Version': '2.0.0'
            }
          })
        ]);

        profileData = profileResponse.data;
        const emailData = emailResponse.data;
        
        if (emailData.elements && emailData.elements[0]) {
          email = emailData.elements[0]['handle~'].emailAddress;
        }
        
        console.log('LinkedIn legacy API responses:', { profile: profileData, email });
      }

      if (!email) {
        throw new Error('No email found in LinkedIn profile');
      }
      const userProfile = {
        provider: 'linkedin',
        id: profileData.sub || profileData.id,
        displayName: profileData.name || 
                    (profileData.localizedFirstName && profileData.localizedLastName ? 
                     `${profileData.localizedFirstName} ${profileData.localizedLastName}` : ''),
        name: {
          familyName: profileData.family_name || profileData.localizedLastName,
          givenName: profileData.given_name || profileData.localizedFirstName
        },
        emails: [{ value: email }],
        photos: profileData.picture ? [{ value: profileData.picture }] : [],
        _raw: JSON.stringify(profileData),
        _json: profileData
      };

      console.log('Constructed LinkedIn profile:', userProfile);
      return done(null, userProfile);

    } catch (error) {
      console.error('LinkedIn profile fetch error:', error.response?.data || error.message);
      return done(error);
    }
  }
}
passport.use(
  new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: process.env.LINKEDIN_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("LinkedIn strategy callback - profile:", profile);
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        
        if (!email) {
          console.error("No email found in LinkedIn profile");
          return done(new Error("No email found in LinkedIn profile"), null);
        }

        const existingUser = await Admin.findOne({ email });
        if (!existingUser) {
          console.log("New LinkedIn user, will redirect to signup");
          return done(null, { profile, isNew: true });
        }

        console.log("Existing LinkedIn user found");
        return done(null, existingUser);
      } catch (err) {
        console.error("Error in LinkedIn strategy:", err);
        return done(err, null);
      }
    }
  )
);