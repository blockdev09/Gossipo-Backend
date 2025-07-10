const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:4173",
    process.env.CLIENT_URL,
    "https://gossipo-frontend.vercel.app/"
  ],
  credentials: true,
};

const gossipoToken = "Gossipo-token";

export { corsOptions, gossipoToken };
