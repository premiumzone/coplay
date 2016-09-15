(function() {
	'use strict';
	/* globals d3 */
	/* jshint unused: vars */
	window.teliaCoplay = window.teliaCoplay || {};

  /**
   * @constructor
   * @param {String} rootElemSelector
   * @param {Array<Object>} initialNodes (Optional)
   */
	var Bubbles = function(rootElemSelector, initialNodes) {
    if (typeof(rootElemSelector) !== 'string') {
      throw Error('Invalid argument `rootElemSelector`.');
    }
    if (!document.querySelector(rootElemSelector)) {
      throw Error('Invalid argument `rootElemSelector` - no element found.');
    }
    if (!initialNodes || !(initialNodes instanceof Array)) {
      initialNodes = [];
    }

    this._nodeMargin = 20;
    this._nodeColors = [
      '#ec6467',
      '#e22465',
      '#60348b',
      '#9933ff'
    ];
    this._rootElem = document.querySelector(rootElemSelector);
    this._canvasSize = this._getCanvasSize();

    this._svgElem = d3.select(rootElemSelector).append('svg')
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('viewBox', '0 0 ' + this._canvasSize.width + ' ' + this._canvasSize.height)
      .attr('width', this._canvasSize.width)
      .attr('height', this._canvasSize.height);

    this._force = d3.layout.force()
      .friction(0.9)
      .gravity(0.015)
      .alpha(0.1)
      .size([this._canvasSize.width, this._canvasSize.height]);

    this._nodes = this._force.nodes();

    d3.select(window).on(
      'resize',
      teliaCoplay.utils.throttle(
        teliaCoplay.utils.proxy(this._onWindowResize, this),
        200
      )
    );

    this._init(initialNodes);
  };

  /**
   * @param {Array<Object>} initialNodes
   */
  Bubbles.prototype._init = function(initialNodes) {
    for (var i = 0; i < initialNodes.length; i++) {
      this.addNode(initialNodes[i]);
    }

    var _this = this;
    setTimeout(function() {
      // make it all go
      _this._update.call(_this);
    }, 1000);
  };

  Bubbles.prototype._getCanvasSize = function() {
    var styles = getComputedStyle(this._rootElem);
    var padding = {
      'top': parseInt(styles.paddingTop, 10),
      'right': parseInt(styles.paddingRight, 10),
      'bottom': parseInt(styles.paddingBottom, 10),
      'left': parseInt(styles.paddingLeft, 10)
    };

    var size = {
      'width': window.innerWidth - padding.left - padding.right,
      'height': window.innerHeight - padding.top - padding.bottom
    };

    return size;
  };

  /**
   * @param {String} nodeID
   */
  Bubbles.prototype._getNodeIndex = function(nodeID) {
    var index = -1;
    for (var i = 0; i < this._nodes.length; i++) {
      if (this._nodes[i].id === nodeID) {
        index = i;
        break;
      }
    }
    return index;
  };

  /**
	 * Collision detection
   * @param {Object} node
   * @return {Function}
	 */
  Bubbles.prototype._collide = function(node) {
    var _this = this;

    var r = node.radius;
    var nx1 = node.x - r;
    var nx2 = node.x + r;
    var ny1 = node.y - r;
    var ny2 = node.y + r;

    return function(quad, x1, y1, x2, y2) {
      if (quad.point && quad.point !== node) {
        var x = node.x - quad.point.x,
        y = node.y - quad.point.y,
        l = Math.sqrt(x * x + y * y),
        r = node.radius + quad.point.radius + _this._nodeMargin;

        if (l < r) {
          l = (l - r) / l * 0.2;
          node.x -= x *= l;
          node.y -= y *= l;
          quad.point.x += x;
          quad.point.y += y;
        }
      }

      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    };
  };

  /**
   * @param {Number} nodeIndex
   */
  Bubbles.prototype._getNodeColor = function(nodeIndex) {
    return this._nodeColors[nodeIndex % this._nodeColors.length];
  };

  Bubbles.prototype._update = function() {
    var _this = this;

    var nodes = this._svgElem.selectAll('g.node')
      .data(this._nodes, function(d) { return d.id; });

    var nodesEnter = nodes.enter().append('g')
      .attr('class', 'node');
    var nodesExit = nodes.exit();

    nodesEnter.append('circle')
      .classed('circleBg', true)
      .attr('r', 0)
      .attr('fill', function(d, i) {
        return _this._getNodeColor.call(_this, i);
      });

    nodesEnter.append('circle')
      .classed('circle', true)
      .attr('r', 0)
      .style('fill', function(d) {
        return 'url(#' + d.id + ')';
      })
      .on('click', this._onNodeClick);

    nodesEnter.append('svg:defs')
      .classed('image', true)
      .append('svg:pattern')
      .attr('id', function(d) { return d.id; })
      .attr('patternUnits', 'objectBoundingBox')
      .attr('width', function(d) { return 1; })
      .attr('height', function(d) { return 1; })
      .append('svg:image')
      .attr('xlink:href', function(d) {
        return d.spotifyAvatarURL || '/static/images/default-avatar.png';
      })
      .attr('width', function(d) { return 1; })
      .attr('height', function(d) { return 1; });

    /**
     * Transition in
     */
    nodes.select('.circle').transition()
      .duration(500)
      .attr('r', function(d) { return d.radius; });
    nodes.select('.circleBg').transition()
      .duration(500)
      .attr('r', function(d) {
        return d.radius;
      });
    nodes.select('defs pattern image').transition()
      .duration(500)
      .attr('width', function(d) { return d.radius * 2; })
      .attr('height', function(d) { return d.radius * 2; });

    /**
     * Transition out
     */
    nodesExit.select('.circle').transition()
      .duration(500)
      .attr('r', 0)
      .remove();
    nodesExit.select('.circleBg').transition()
      .duration(500)
      .attr('r', 0)
      .remove();
    nodesExit.select('defs image').transition()
      .duration(500)
      .attr('width', function(d) { return 1; })
      .attr('height', function(d) { return 1; })
      .remove();
    nodesExit
      .transition()
      .duration(500)
      .remove();

    this._force.on('tick', function(e) {
      var q = d3.geom.quadtree(_this._nodes);

      for (var i = 0; i < _this._nodes.length; i++) {
        q.visit(_this._collide.call(_this, _this._nodes[i]));
      }

      _this._svgElem.selectAll('.node')
        .attr('transform', function(d) {
          return 'translate(' + Number(d.x.toFixed(1)) + ',' + Number(d.y.toFixed(1)) + ')';
        });
    });

    // restart the force layout
    this._force.start();

    setInterval(function(){
      _this._force.alpha(0.1);
    }, 1000);
  };

  /**
   * @param {Object} nodeData
   */
  Bubbles.prototype._onNodeClick = function(nodeData) {
    teliaCoplay.StateManager.setState('/user/info', nodeData);
  };

  Bubbles.prototype._onWindowResize = function() {
    this._canvasSize = this._getCanvasSize();

    this._svgElem
      .attr('width', this._canvasSize.width)
      .attr('height', this._canvasSize.height)
      .attr('viewBox', '0 0 ' + this._canvasSize.width + ' ' + this._canvasSize.height);
    this._force.size([this._canvasSize.width, this._canvasSize.height]).resume();
  };

  /**
   * Add and remove elements on the graph object
   * @param {Object} nodeData
   */
  Bubbles.prototype.addNode = function(nodeData) {
    console.debug('Bubbles.addNode: ', nodeData);

    this._nodes.push({
      id: nodeData.spotifyUsername,
      spotifyAvatarURL: nodeData.spotifyAvatarURL,
      spotifyUsername: nodeData.spotifyUsername,
      spotifyFullName: nodeData.spotifyFullName,
      spotifyGuessedFirstName: nodeData.spotifyGuessedFirstName,
      spotifyGuessedLastName: nodeData.spotifyGuessedLastName,
      spotifyTopTracks: nodeData.spotifyTopTracks,
      radius: 45,
      x: this._canvasSize.width/2 + Math.random(10) * 10,
      y: this._canvasSize.height/2 + Math.random(10) * 10
    });

    // decrease all node sizes by 5% when a new node is added
    for (var i = 0; i < this._nodes.length; i++) {
      if (this._nodes[i].radius >= 20) {
        this._nodes[i].radius = this._nodes[i].radius * 0.98;
      }
    }

    this._update();
  };

  /**
   * @param {String} replaceNodeID
   * @param {Object} replacingNodeData
   */
  Bubbles.prototype.replaceNode = function(replaceNodeID, replacingNodeData) {
    console.debug('Bubbles.replaceNode: ', arguments);

    if (this.removeNode(replaceNodeID, true) === false) {
      return;
    }

    var _this = this;
    setTimeout(function() {
      _this.addNode.call(_this, replacingNodeData);
    }, 1000);
  };

  /**
   * @param {String} nodeID
   * @param {Boolean} isReplace (Optional)
   */
  Bubbles.prototype.removeNode = function(nodeID, isReplace) {
    console.debug('Bubbles.removeNode: ', nodeID, isReplace);

    var index = this._getNodeIndex(nodeID);
    if (index === -1) {
      console.warn(
        'Could not '+(isReplace ? 'replace' : 'remove')+' node - no current node with id \'%s\'',
        nodeID
      );
      return false;
    }
    this._nodes.splice(index, 1);
    this._update();
  };

  teliaCoplay.Bubbles = Bubbles;
})();
