# Triib Scrape

## Back Story

This repo is the result of trying to figure out a way to extract workout results from [Triib](https://triib.com/) and transform them into a useful format for importing into another fitness-tracking app.

* No API available
* No support from company
* "No way to do that"

## Prerequisites

* Node.js
* An admin account for a gym (aka "box") at triib.com
* Patience

## Installation and Setup

1. Clone the repo

      ```bash
      git clone git@github.com:kswedberg/triib-scrape.git
      ```

2. Install dependencies

    ```bash
    yarn install
    ```

3. Copy .env.example to .env

    ```bash
    cp .env.example .env
    ```

4. In `.env`, enter your Triib login credentials and the URL to your Triib instance

    ```ini
    USER_EMAIL='yourname@example.com'
    USER_PWD='YOUR_TRIIB_PASSWORD'
    BASE_URL='https://YOUR_SUBMDOMAIN.triib.com'
    ```

## Usage

1. get a list of members
