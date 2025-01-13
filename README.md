# Solflix dApp

Live Url: https://solflix-sol.vercel.app/

Anonymous media sharing platform. The dApp lets user to share videos, where authentication and authorization is done via smart program deployed on Solana Devnet

### Project Structure

- Anchor Program is within `anchor_project` directory]
- Frontend is within `frontend` repository

For specific instructions and detail information of Program is contained in `anchor_project` [Readme](https://github.com/School-of-Solana/program-ayushagarwal27/blob/main/anchor_project/README.md)

 ### Frontend Setup

 - navigate to `frontend` directory
```shell 
    pnpm i
```
```shell 
    npm run dev
```

For cloudinary integration, create an account here https://cloudinary.com/ and define  keys in .env

```
NEXT_PUBLIC_CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=""
 ```

### Libraries and Frontend Flow

- Next.js (UI Framework)
- Daisy UI, TawilindCss (Styling)
- Cloudinary (Video Storage, Video Player) 
- Vercel (Deployment)
- Solana Wallet Adapter, Anchor, web3 
  - (connecting with solana cluster, connecting wallet, sending transactions)

### 3 pages
1. Home page 
   - get all the videos uploaded by creators
   - send getAllAccount transaction, with specific PDA data size of `create_account`
   - display the data in cards

2. Upload page
    - enable creator to upload video on cloudinary
    - post endpoint for same is defined under api/upload directory
    - once uploaded, creator can enter information in form to create PDA for same 

3. Access page
   - Once user click on play now button of Video Card
   - We check whether `access_account` PDA is there 
   - If PDA exists, user is redirected from homepage to access page
   - If not, `access_account` PDA is created, deducting balance from user account and redirecting user to access page.