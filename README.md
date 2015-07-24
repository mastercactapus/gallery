# gallery

A rough but effective image gallery. More of an experiment than anything, uses react and webpack (with babel) to manage content for photoswipe.

## Setup

Build frontend assets:

```bash
npm install
node_modules/.bin/webpack
```

Build the app
```bash
go build
```

Set environmental variables:

`OAUTH_CLIENT_ID=` your google oauth2 client ID
`ADMIN_EMAIL=` one or more space-separated email addresses to allow managing content

Run the app
```bash
./gallery
```

The main gallery is at http://localhost:8000
The admin panel is at http://localhost:8000/admin
