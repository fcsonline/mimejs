/*globals: Peer*/

var MAX_TTL = 3;

var neighbors = [];

var searches = [];

var peer = new Peer({key: '4vpiknz2zlcgzaor'});

peer.on('open', function(id) {
  console.log('My peer ID is: ' + id);
});

peer.on('connection', function(conn) {
  console.log('Incoming connection: ', conn);

  conn.on('open', function() {
    neighbors_reply(conn);

    // Receive messages
    conn.on('data', function(data) {
      console.log('Received', data);
      process(data, conn);
    });

    // Send messages
    conn.send('Hello!');
  });
});

function neighbors_ids () {
  return _.map(neighbors, function (neighbor) {
    return neighbor.peer;
  });
}

function neighbors_reply (conn) {
  if (!_.contains(neighbors_ids(), conn.peer)) {
    var neighbor = peer.connect(conn.peer);
    neighbors.push(neighbor);
  }
}

function meet () {
  var id
    , neighbor;

  id = prompt();
  neighbor = peer.connect(id);

  neighbors.push(neighbor);
}

function search (word, ttl, origin) {
  console.log('Searching word:' + word + ', with ttl: ' + ttl);

  _.each(neighbors, function (neighbor) {
    if (neighbor && origin && neighbor.peer === origin.peer) {
      return;
    }

    neighbor.send({
      type: 'search'
    , query: word
    , ttl: (_.isUndefined(ttl)? MAX_TTL : ttl)
    });
  })
}

function search_match (data, origin) {
  if (peer.id.match(data.query)) {
    var conn = _.find(neighbors, function (neighbor) {
      return neighbor.peer === origin.peer;
    });

    conn.send({
      type: 'search_reply'
    , query: data.query
    , value: peer.id
    });
  }
}

function process (data, origin) {
  var ttl
    , original_search
    , conn;

  if (data.type === 'search' && data.ttl > 0) {
    console.log('Searching word:' + data.query);
    searches.push(_.extend({
      origin: origin.peer
    }, data));
    ttl = _.min([data.ttl - 1, MAX_TTL]); // Don't trust the original ttl
    search_match(data, origin);
    search(data.query, ttl, origin);
  } else if (data.type === 'search_reply') {
    // FIXME:
    original_search = _.find(searches, function (search) {
      return search.query === data.query;
    });

    if (!original_search) {
      console.log('Received search reply:' + data.value);
    } else {

      conn = _.find(neighbors, function (neighbor) {
        return neighbor.peer === original_search.origin;
      });

      // Forward search
      conn.send(data);
    }

  }
}
