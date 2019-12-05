# Data model

## Event

Events contain details about specific events or series of related events. Events can have child nodes which are events in of themselves, this way a larger event spanning multiple days can contain smaller events under its umbrella. This means that events are recursive and are not limited in depth so avoid nesting events too deep, normal expected use cases are to have events of 1-3 levels deep only.

Permissions to modify an event is restricted to the users in the admin list, for everyone else the event is read-only.

Event visibility is controlled by the visibility field which has four values in descending order of privacy:

* `private` events are visible only to users listed in the admins attributes. Example use cases include events which are not ready to be published or placeholders for future events
* `inviteonly` events are visible only to users listed the admins or whitelist attributes. This setting is used for private events with a controlled guest list, for these cases admins are expected to manage the whitelist. This is the only setting which uses the whitelist attribute
* `unlisted` events are not searchable from the /events endpoint, however they are publicly visible and GET requests will return the event to anyone. These events are for more loose circumstances where a user may share their event with others, who in turn are allowed to forward the event to their contacts
* `public` events are visible to all and can be searched by anyone through the /events endpoint. These events are designed to be visible to all.

Example event:

```json
{
    "_id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "admins": [
        "9338b5ad-49c2-4efe-b8b2-ab0b2c57a9d7",
        "2c6a929c-4e93-4cd7-b470-c796945491ed"
    ],
    "created": "2019-10-23T19:02Z",
    "createdBy": "9338b5ad-49c2-4efe-b8b2-ab0b2c57a9d7",
    "desc": "This is an example event. There are many like it, but this one is mine.",
    "endDateTime": "2019-11-30T01:00Z",
    "location": {
        "_id": "4569e8d6-89d7-4708-9990-a6c352656976",
        "address": {
            "city": "Helsinki",
            "streetName": "Narinkkatori"
        },
        "name": "Narinkkatori / outside Kamppi"
    },
    "modified": "2019-11-01T12:32Z",
    "modifiedBy": "2c6a929c-4e93-4cd7-b470-c796945491ed",
    "name": "Cool Example Event",
    "startDateTime": "2019-11-29T19:00Z",
    "visibility": "public"
}
```

## Location

Locations contain data on event locales which contain data which can be converted to a searchable address or GPS coordinates which can then be used by a map service to display the location.

Example:

```json
{
    "_id": "4569e8d6-89d7-4708-9990-a6c352656976",
    "address": {
        "city": "Helsinki",
        "country": "Finland",
        "postalCode": "00100",
        "streetName": "Kauppatori",
        "streeNumber": "1"
    },
    "gpsCoordinates": {
        "latitude": "60.1672811",
        "longitude": "24.9502072"
    },
    "name": "Havis Amanda"
}
```

Note that locations in the event are supplied by the user so incomplete entries are possible. The address data supplied by the user can be entered into a map service (e.g. Google Maps) which can fill in the missing fields including GPS coordinates.

## User

The user entity represents a user in the system and can contain personal info, as well as control permissions. As a result, fields in this entity can be public or private: public fields are visible to all while private fields are only visible to the user.

Example:

```json
{
    "_id": "fe66e392-0187-48a9-943f-792dccb2b879",
    "displayName": "Joe Bloggs",
    "events": [],
    "firstName": "Joe",
    "surname": "Bloggs"
}
```
