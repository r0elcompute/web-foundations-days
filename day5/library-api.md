# Library Books API

The API manages books at `/books`. Book identifiers are represented by `{id}`.

## Endpoints

- **List all books**
  - Method: `GET`
  - Path: `/books`
  - Description: Returns the collection of books.
  - Success status: `200 OK`

- **Get one book**
  - Method: `GET`
  - Path: `/books/{id}`
  - Description: Returns the book with the requested identifier.
  - Success status: `200 OK`

- **Create a book**
  - Method: `POST`
  - Path: `/books`
  - Description: Adds a book to the collection.
  - Example request body:
    ```json
    {
      "title": "The Left Hand of Darkness",
      "author": "Ursula K. Le Guin",
      "publishedYear": 1969
    }
    ```
  - Success status: `201 Created`

- **Update a book**
  - Method: `PUT`
  - Path: `/books/{id}`
  - Description: Replaces the editable details of the identified book.
  - Example request body:
    ```json
    {
      "title": "The Left Hand of Darkness",
      "author": "Ursula K. Le Guin",
      "publishedYear": 1969
    }
    ```
  - Success status: `200 OK`

- **Delete a book**
  - Method: `DELETE`
  - Path: `/books/{id}`
  - Description: Removes the identified book from the collection.
  - Success status: `204 No Content`

- **List books by author**
  - Method: `GET`
  - Path: `/books?author=Ursula%20K.%20Le%20Guin`
  - Description: Returns books whose author matches the `author` query parameter.
  - Success status: `200 OK`

## Error responses

- `400 Bad Request`: The request contains invalid data, such as a create request with a missing title.
- `404 Not Found`: The requested book identifier does not exist, such as `GET /books/9999`.
