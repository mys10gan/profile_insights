# Structure Flow of the Document

# Tech stack to use for the project
- Nextjs
- Shadcn
- Tailwind
- Lucid icon
- Supabase
- Openrouter
- Claude
- Apify

# Flow of the project

- First step will be, the user will login using his email and Password and we have to create an account option.
- This will be done using the supabase authentication. Once the user will login, will have two options to Toggle between, one for linkedIN and one for instagram.
- There we will input text area for both the linkedin and instagram, for instagram the user will enter the username and for linkedIN the user will put the profile link.
- Once the user enters the username, it will trigger a webhook, and this will call the Scraping API.
webhook, and this will call the Scraping API.
- Here we are using Apify Platform to scrape data from
the instagram profile and LinkedIN profile.
Link for the Apify Platform for respective instagram
and LinkedIN scraping.
- For Instagram we will fetch both post and reels data.
  - https://console.apify.com/actors/nH2AHrwxeTRJoN5hX/input
- For LinkedIN we will fetch the post data.
  - https://console.apify.com/actors/kfiWbq3boy3dWKbiL/input

- Once the data is scrapped , this will be saved in supabase database.
- This data is stored in json format.
- Next step is to create an AI agent. This will be a conversational agent, which will be connected to claude using open Router API.
- So the AI agent will work like this, Once the scrapping is completed, a analysis message will be shown, and after question to the AI agent, The AI agent then will fetch the data from the supabase, and send it to Claude and will give an output based on the user's question.

Points to remember:
- The supabase database should be dynamic, such that the previous data should be erased and new scraped data should be updated every time the user tries to get analysis of new username.
- The data input by the user during the chating should be erased once the conversation is done.

Links for all the Platforms used in the project.
- API docs of Apify Scraping data Platform (https://docs.apify.com/api)
- API docs of Supabase Platform (https://supabase.com/docs)
- API docs of OpenRouter Platform (https://openrouter.ai/docs/quickstart)

In an AI agent, we have to give certain instructions such that the AI agent follows the set of instructions, which will be given as Knowledge to the AI agent. Below are the file links for both Instagram and LinkedIN Knowledge base instruction.
- Knowledge base for Instagram (https://simple-carob-ab8.notion.site/IG-final-system-prompt-1ad77bec28db80e18186f502b2198f34)
- Knowledge base for linkedIN (https://simple-carob-ab8.notion.site/LinkedIn-final-system-prompt-1ad77bec28db80e188a5cd3ce8618d06)