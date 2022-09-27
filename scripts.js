let objects = [];

let pause = false;
let stats = false;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Converts radians to degrees
const radiansToDegrees = (radians) => {
  return radians * (180 / Math.PI);
}

// Coverts degrees to radians
const degreesToRadians = (degrees) => {
  return degrees / (180 / Math.PI);
}

// Finds distance between two provided points
const pointsDistance = (point1, point2) => {
  return Math.sqrt(
    Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
  );
};

// Generates random normalized vector
const randomNormalizedVector = () => {
  let x = Math.random() * 2 - 1;
  let y = Math.sqrt(1 - Math.pow(x, 2)) * Math.sign(Math.random() - 0.5);
  return { x: x, y: y };
};

// Returns vector length
const abs = (vector) => {
  return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
};

// Returns normalized vector
const normalizeVector = (vector) => {
  length = abs(vector);
  return { x: vector.x / length, y: vector.y / length };
};

// Returns scalar product of two vectors
const scalarProduct = (vector1, vector2) => {
  return vector1.x * vector2.x + vector1.y * vector2.y;
};

// All the small functions end here
//==================================================================================================

// This function finds closest circle to the provided object,
// this object can be both circle or rectangle
const findClosestCircle = (obj) => {
  let closestCircle = null, closestPoint = null, distance = -1;

  //---------------------------< Obj is circle >-----------------------------
  if (obj.type === "circle") {
    let circle = obj;
    // check if there are any other circles at all to look for 
    if (objects.filter((obj) => obj.type === "circle").length === 1) 
      return { closestCircle, closestPoint, distance };

    // Go through all the objects and find the closest circle
    closestCircle = objects.reduce((closest, curr) => {
      // check if current candidate is a circle and not the original circle that was passed to the function
      if (circle !== curr && curr.type === "circle") {
        // compare distance between previous closest circle and the original circle
        // to distance between candidate(current) circle and the original circle
        // if the first distance is smaller then keep the closest circle as it is
        // unless save the current candidate circle as the closest circle 
        if (
          !closest ||
          pointsDistance(
            { x: circle.x, y: circle.y },
            { x: closest.x, y: closest.y }
          ) > pointsDistance({ x: circle.x, y: circle.y }, { x: curr.x, y: curr.y })
        )
          return curr;
      }
      return closest;
    }, null);
  //----------------------------------------------------------------------------
  //---------------------------< Obj is rectangle >-----------------------------
  } else if (obj.type === "rectangle") {
    let rectangle = obj;

    // Go through all the objects and find the closest circle
    ({ closestCircle, closestPoint, distance } = objects.reduce(
      (prev, curr) => {
        // ignore all the rectangles
        if (curr.type === "rectangle") return prev;

        // find the closest point
        let closestPoint = {
          x: Math.max(rectangle.x, Math.min(curr.x, rectangle.x + rectangle.width)),
          y: Math.max(rectangle.y, Math.min(curr.y, rectangle.y + rectangle.height)),
        };

        // build vector to the closest point
        let vectorToClosestPoint = {
          x: closestPoint.x - curr.x,
          y: closestPoint.y - curr.y,
        };

        // find the length of this vector
        let distance = abs(vectorToClosestPoint);

        // compare the distance of the current candidate to the previous closest circle
        // save the closest one as the closest circle
        if (prev.distance < 0 || distance < prev.distance) {
          return { closestCircle: curr, closestPoint, distance };
        }
        return prev;

      },
      { closestCircle: null, closestPoint: null, distance: -1 }
    ));
  }
  //----------------------------------------------------------------------------

  return { closestCircle, closestPoint, distance };
};

// Calculates new position of the circle using provided collided circle
// @param circle - the circle that we want to calculate new position for
// @param collidedCircle - circle that the other circle collided with
// @return new position of the circle
const calculateNewCirclePosition = (circle, collidedCircle) => {
  // vector towards the point of contact with the circle
  let pointOfContactVector = normalizeVector({
    x: collidedCircle.x - circle.x,
    y: collidedCircle.y - circle.y,
  });

  // find an angle between the point of collision(vector that points towards it)
  // and movement vector of the circle
  let collisionAngle = Math.acos(scalarProduct(circle.vector, pointOfContactVector));

  // rotate pointOfContactVector 90 degrees clockwise to use it to identify if this
  // vector is on the right or the left of the movement vector
  let pointOfContactVector90CW = {
    x: pointOfContactVector.y,
    y: -pointOfContactVector.x,
  };
  // find its angle 
  let collisionAngle90CW = Math.acos(
    scalarProduct(circle.vector, pointOfContactVector90CW)
  );

  // we find out if this ball was hit on front or from behind
  // if on front then it changes its movement direction
  // if from behind then it just slightly changes direction
  let rotationAngle;
  if (radiansToDegrees(collisionAngle) <= 90)
    rotationAngle = degreesToRadians(180) - collisionAngle * 2;
  else rotationAngle = (degreesToRadians(180) - collisionAngle) / 2;

  // using rotated collision vector we find out from where was the circle hit
  // and rotate the movement vector accordingly, either clockwise or counterclockwise
  if (radiansToDegrees(collisionAngle90CW) > 90) {
    circle.vector = {
      x:
        circle.vector.x * Math.cos(rotationAngle) -
        circle.vector.y * Math.sin(rotationAngle),
      y:
        circle.vector.x * Math.sin(rotationAngle) +
        circle.vector.y * Math.cos(rotationAngle),
    };
  } else {
    circle.vector = {
      x:
        circle.vector.x * Math.cos(rotationAngle) +
        circle.vector.y * Math.sin(rotationAngle),
      y:
        -circle.vector.x * Math.sin(rotationAngle) +
        circle.vector.y * Math.cos(rotationAngle),
    };
  }

  // find the distance between circles' centers
  let distanceBetweenCircles = pointsDistance(
    { x: circle.x, y: circle.y },
    { x: collidedCircle.x, y: collidedCircle.y }
  );
  // find overlapping depth between circles to then push the circle out of the collided circle
  let overlappingDepth = circle.r + collidedCircle.r - distanceBetweenCircles;
  // apply all the calculation to generate new position
  let newPosition = {
    x: circle.x - pointOfContactVector.x * overlappingDepth + circle.vector.x,
    y: circle.y - pointOfContactVector.y * overlappingDepth + circle.vector.y,
  };

  return newPosition;
};

// Draws all the objects
const drawFrame = () => {
  if (pause) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  //ctx.fillStyle = `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`;
  ctx.fillStyle = `blue`;
  objects.forEach((obj) => {
    switch (obj.type) {
      case "circle":
        // Draw circle
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.r, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();

        break;

      case "rectangle":
        // Draw rectangle
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(obj.x, obj.y, obj.width, obj.height);
        ctx.stroke();
        ctx.fill();

        break;
    }
  });

  if (stats === true) {
    let closestCircle, closestPoint, distance;
    objects.forEach((obj) => {
      switch (obj.type) {
        case "circle":
          // Draw circle's vector
          ctx.strokeStyle = "green";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y);
          ctx.lineTo(
            obj.x + obj.vector.x * obj.r * 1.5,
            obj.y + obj.vector.y * obj.r * 1.5
          );
          ctx.stroke();

          // Draw line to the closest circle
          ({ closestCircle } = findClosestCircle(obj));
          if (closestCircle) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y);
            ctx.lineTo(closestCircle.x, closestCircle.y);
            ctx.stroke();
          }
          break;
        case "rectangle":
          ({ closestCircle, closestPoint, distance } = findClosestCircle(obj));

          if (closestCircle) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(closestCircle.x, closestCircle.y);
            ctx.lineTo(closestPoint.x, closestPoint.y);
            ctx.stroke();
          }

          break;
      }
    });
  }
};

// Updates position of all the objects(circles to be precise as they are the only one that move)
const updatePosition = () => {
  if (pause) return;

  objects = objects.map((obj) => {
    // we don't need to update rectangle position as it is static
    if (obj.type === "rectangle") return obj;

    let newPosition = { x: obj.x + obj.vector.x, y: obj.y + obj.vector.y };

    // find out if circle touches or outside boundaries
    if (newPosition.x < obj.r || newPosition.x > document.body.offsetWidth - obj.r) {
      obj.vector.x = -obj.vector.x;
      if (newPosition.x < obj.r) newPosition.x = obj.r;
      else newPosition.x = document.body.offsetWidth - obj.r;
    } else if (
      newPosition.y < obj.r ||
      newPosition.y > document.body.offsetHeight - obj.r
    ) {
      obj.vector.y = -obj.vector.y;
      if (newPosition.y < obj.r) newPosition.y = obj.r;
      else newPosition.y = document.body.offsetHeight - obj.r;
    }

    // identify collided object if there is any
    const collidedObj = objects.find((o) => {
      if (o === obj) return false;

      // if distance between circles' center less than sum of their radii
      // then these circles intersect each other
      if (o.type === "circle") {
        if (
          pointsDistance({ x: o.x, y: o.y }, { x: obj.x, y: obj.y }) <=
          o.r + obj.r
        )
          return true;
      } else if (o.type === "rectangle") {
        let closestCircle, distance;
        ({ closestCircle, distance } = findClosestCircle(o));

        // check if circle stuck inside the rectangle
        if (
          obj.x > o.x &&
          obj.x < o.x + o.width &&
          obj.y > o.y &&
          obj.y < o.y + o.height
        ) {
          return true;
        }

        // if the closest circle is the current circle and its distance to the closest point
        // of this rectangle is less then radii of the circle then this circle intersects with
        // the rectangle
        if (closestCircle === obj && distance <= closestCircle.r) {
          return true;
        }
      }
      return false;
    });

    if (collidedObj?.type === "circle") {
      let collidedCircle = collidedObj;

      if (collidedCircle) {
        // all the collision of the circles is handled by the separate function as it is needed
        // for both collided circles to get new updated position
        newPosition = calculateNewCirclePosition(obj, collidedCircle);

        newPositionCollidedCircle = calculateNewCirclePosition(collidedCircle, obj);
        collidedCircle.x = newPositionCollidedCircle.x;
        collidedCircle.y = newPositionCollidedCircle.y;
      }
    } else if (collidedObj?.type === "rectangle") {
      let collidedRectangle = collidedObj;

      // check if circle stuck inside the rectangle
      if (
        obj.x > collidedRectangle.x &&
        obj.x < collidedRectangle.x + collidedRectangle.width &&
        obj.y > collidedRectangle.y &&
        obj.y < collidedRectangle.y + collidedRectangle.height
      ) {
        // find the closest point to the boundary of the rectangle
        let closestPointsCandidates = [
          { x: obj.x, y: collidedRectangle.y },
          { x: obj.x, y: collidedRectangle.y + collidedRectangle.height },
          { x: collidedRectangle.x, y: obj.y },
          { x: collidedRectangle.y + collidedRectangle.width, y: obj.y },
        ];
        closestPoint = closestPointsCandidates.reduce((prev, curr) => {
          if (
            !prev ||
            pointsDistance(prev, { x: obj.x, y: obj.y }) >
              pointsDistance(curr, { x: obj.x, y: obj.y })
          ) {
            return curr;
          }
          return prev;
        }, null);

        // build vector to the point
        let vectorToClosestPoint = normalizeVector({
          x: closestPoint.x - obj.x,
          y: closestPoint.y - obj.y,
        });

        // find how deep circle stuck inside the rectangle
        let overlappingDepth =
          obj.r + pointsDistance({ x: obj.x, y: obj.y }, closestPoint);

        // teleport the circle out of the rectangle
        newPosition = {
          x: obj.x + vectorToClosestPoint.x * overlappingDepth,
          y: obj.y + vectorToClosestPoint.y * overlappingDepth,
        };
      } else {
        // find closest point to the rectangle(which is the collision point as well for this circle)
        let closestPoint = {
          x: Math.max(
            collidedRectangle.x,
            Math.min(obj.x, collidedRectangle.x + collidedRectangle.width)
          ),
          y: Math.max(
            collidedRectangle.y,
            Math.min(obj.y, collidedRectangle.y + collidedRectangle.height)
          ),
        };

        // build vector to the collision point
        let vectorToClosestPoint = normalizeVector({
          x: closestPoint.x - obj.x,
          y: closestPoint.y - obj.y,
        });

        // find angle between the movement vector and the collision point
        let collisionAngle = Math.acos(
          scalarProduct(obj.vector, vectorToClosestPoint)
        );

        // rotate the vector to the collision point by 90 degrees clockwise to identify
        // if the vector is on the left or right of the movement vector
        let vectorToClosestPoint90CW = {
          x: vectorToClosestPoint.y,
          y: -vectorToClosestPoint.x,
        };

        // find the new angle between the rotated vector and the movement vector
        let collisionAngle90CW = Math.acos(
          scalarProduct(obj.vector, vectorToClosestPoint90CW)
        );

        // depending on the results rotate the movement vector clockwise by the rotationAngle
        // or counterclockwise
        let rotationAngle = degreesToRadians(180) - collisionAngle * 2;
        if (radiansToDegrees(collisionAngle90CW) > 90) {
          obj.vector = {
            x:
              obj.vector.x * Math.cos(rotationAngle) -
              obj.vector.y * Math.sin(rotationAngle),
            y:
              obj.vector.x * Math.sin(rotationAngle) +
              obj.vector.y * Math.cos(rotationAngle),
          };
        } else {
          obj.vector = {
            x:
              obj.vector.x * Math.cos(rotationAngle) +
              obj.vector.y * Math.sin(rotationAngle),
            y:
              -obj.vector.x * Math.sin(rotationAngle) +
              obj.vector.y * Math.cos(rotationAngle),
          };
        }

        // find how deep the circle is inside the rectangle
        let overlappingDepth =
          obj.r - pointsDistance({ x: obj.x, y: obj.y }, closestPoint);

        // generate new position after all calculations
        newPosition = {
          x: obj.x - vectorToClosestPoint.x * overlappingDepth + obj.vector.x,
          y: obj.y - vectorToClosestPoint.y * overlappingDepth + obj.vector.y,
        };
      }
    }

    // return the object with the updated position
    return {
      type: obj.type,
      x: newPosition.x,
      y: newPosition.y,
      vector: { x: obj.vector.x, y: obj.vector.y },
      r: obj.r,
    };
  });
};

//=======================================< Window Onload >============================================
window.onload = (e) => {
  // Cursor coordinates to track mouse position
  let cursorX = 0;
  let cursorY = 0;

  const spanCursorX = document.getElementById("x-mouse");
  const spanCursorY = document.getElementById("y-mouse");

  canvas.width = document.body.offsetWidth;
  canvas.height = document.body.offsetHeight;

  // this variable help tracking the rectangle that is currently being drawn
  let drawnRect = {};

  // draw frame every 40 ms
  setInterval(() => {
    drawFrame();
  }, 40);

  // update position of all object every 25 ms
  setInterval(() => {
    updatePosition();
  }, 25);
  // why these numbers? idk just because it is 25 fps
  // and updatePosition() can be called a bit faster  

  window.addEventListener("mousemove", (e) => {
    // track cursor
    spanCursorX.innerHTML = e.x;
    spanCursorY.innerHTML = e.y;
    cursorX = e.x;
    cursorY = e.y;

    // Check if there is rectangle that is being drawn right now
    drawnRect = objects.find((obj) => {
      if (obj.type === "rectangle" && obj.drawing) {
        return true;
      } else return false;
    });
    // if there is one then update its width and height depending on where the cursor is
    if (drawnRect) {
      drawnRect.width = cursorX - drawnRect.x;
      drawnRect.height = cursorY - drawnRect.y;
    }
  });

  window.addEventListener("keydown", (e) => {
    switch (e.code) {
      case "KeyC":
        // create circle
        objects.push({
          type: "circle",
          x: cursorX,
          y: cursorY,
          vector: randomNormalizedVector(),
          r: 30,
        });
        break;
      case "KeyS":
        // start drawing rectangle
        if (!drawnRect) {
          objects.push({
            type: "rectangle",
            x: cursorX,
            y: cursorY,
            width: 1,
            height: 1,
            vector: { x: 0, y: 0 },
            drawing: true,
          });
          // save rectangle to the variable so other events can access it 
          drawnRect = objects.find((obj) => {
            if (obj.type === "rectangle" && obj.drawing) {
              return true;
            } else return false;
          });
        }
        break;
      case "KeyT":
        // turn statistics(vectors and closest obj line e.g.) on and off
        stats = !stats;
        break;
      case "KeyP":
        // turn pause on and off
        pause = !pause;
      default:
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.code) {
      // when the S key is released that means rectangle is not drawn anymore 
      // and it changes its state
      case "KeyS":
        drawnRect = objects.find((obj) => {
          if (obj.type === "rectangle" && obj.drawing) {
            return true;
          } else return false;
        });
        // also if height or width is negative switch x or y with negative width or height
        // and make them positive to make (x, y) of rectangle be the left top corner of the rectangle
        // and width and height to be positive instead of negative
        if (drawnRect.width < 0) {
          drawnRect.x = drawnRect.x + drawnRect.width;
          drawnRect.width = -drawnRect.width;
        }
        if (drawnRect.height < 0) {
          drawnRect.y = drawnRect.y + drawnRect.height;
          drawnRect.height = -drawnRect.height;
        }
        drawnRect.drawing = false;
        break;
    }
  });
};
