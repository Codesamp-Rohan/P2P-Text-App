# P2P-Text-App

A peer-to-peer (P2P) chat application built using Holepunch and Hyperswarm. This app allows users to chat in real-time without needing a centralized server. No data is saved, so it is only helpful for live chatting, nothing will be saved for future.

## Tech Stack

Frontend: HTML, CSS, JavaScript.

Networking: Holepunch, Hyperswarm.

Backend: None, this is a fully decentralized app.

## Installation

make sure node and npm is installed. To check,

```shell
node -v
npm -v
```

If they are present then install Pear by holepunch.

```shell
npm i -g pear

pear
```

To check Pear is fully working

```shell
pear run pear://keet
```

Now, after checking and installing all the above stuffs, clone the git.

```shell
git clone https://github.com/Codesamp-Rohan/P2P-Text-App.git

cd P2P-Text-App

pear init --yes
pear run --dev . / pear dev
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[codesamp-Rohan](https://github.com/codesamp-rohan)
