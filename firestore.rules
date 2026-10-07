rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function isMember(familyId) {
      return signedIn() &&
        exists(/databases/$(database)/documents/families/$(familyId)/members/$(request.auth.uid));
    }

    match /users/{uid} {
      allow read: if signedIn() && request.auth.uid == uid;
      allow create: if signedIn() && request.auth.uid == uid
        && !('familyId' in request.resource.data);
      allow update: if signedIn() && request.auth.uid == uid
        && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['displayName', 'photoURL', 'fcmTokens']);
      allow delete: if false;
    }

    match /families/{familyId} {
      allow read: if isMember(familyId);
      allow write: if false;

      match /members/{uid} {
        allow read: if isMember(familyId);
        allow write: if false;
      }

      match /ingredients/{id} {
        allow read: if isMember(familyId);
        allow create: if isMember(familyId)
          && request.resource.data.addedBy == request.auth.uid;
        allow update, delete: if isMember(familyId);
      }

      match /calls/{callId} {
        allow read: if isMember(familyId);
        allow create: if isMember(familyId)
          && request.resource.data.senderUid == request.auth.uid
          && request.resource.data.mode in ['make', 'eatout', 'delivery']
          && request.resource.data.menu is string
          && request.resource.data.menu.size() > 0
          && request.resource.data.menu.size() <= 50
          && request.resource.data.createdAt == request.time;
        allow update: if false;
        allow delete: if isMember(familyId)
          && resource.data.senderUid == request.auth.uid;

        match /responses/{uid} {
          allow read: if isMember(familyId);
          allow create, update: if isMember(familyId)
            && uid == request.auth.uid
            && request.resource.data.type in ['cook', 'eatout', 'later'];
          allow delete: if isMember(familyId) && uid == request.auth.uid;
        }
      }

      match /menuStats/{menu} {
        allow read: if isMember(familyId);
        allow write: if false;
      }
    }

    match /invites/{code} {
      allow read, write: if false;
    }

    match /aiUsage/{doc} {
      allow read, write: if false;
    }
  }
}