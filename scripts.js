let objects = [];

let pause = false;
let stats = false;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const lineIntersection = () => {};

// Converts radians to degrees
function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}

// Coverts degrees to radians
function degreesToRadians(degrees) {
  return degrees / (180 / Math.PI);
}

// Finds distance between two provided points
const pointsDistance = (point1, point2) => {
  return Math.sqrt(
    Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
  );
};

const randomNormalizedVector = () => {
  let x = Math.random() * 2 - 1;
  let y = Math.sqrt(1 - Math.pow(x, 2)) * Math.sign(Math.random() - 0.5);
  return { x: x, y: y };
};

const vectorLength = (vector) => {
  return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
};

const normalizeVector = (vector) => {
  length = vectorLength(vector);
  return { x: vector.x / length, y: vector.y / length };
};

const scalarProduct = (vector1, vector2) => {
  return vector1.x * vector2.x + vector1.y * vector2.y;
};

const findClosestCircle = (circle) => {
  if (objects.filter((obj) => obj.type === "circle").length === 1) return null;

  let closestCircle = objects.reduce((closest, curr) => {
    if (circle !== curr && curr.type === "circle") {
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

  return closestCircle;
};

const calculateNewCirclePosition = (circle, collidedCircle) => {
  // vector towards the point of contact with the circle
  let pointOfContactVector = normalizeVector({
    x: collidedCircle.x - circle.x,
    y: collidedCircle.y - circle.y,
  });

  // we find an angle between the point of collision(vector that points towards it)
  // and movement vector of the circle
  let collisionAngle = Math.acos(
    scalarProduct(circle.vector, pointOfContactVector) / 1
  );

  let pointOfContactVector90CW = {
    x: pointOfContactVector.y,
    y: -pointOfContactVector.x,
  };
  let collisionAngle90CW = Math.acos(
    scalarProduct(circle.vector, pointOfContactVector90CW) / 1
  );

  // we find out if this ball was hit on front or from behind
  // if on front then it changes its movement direction
  // if from behind then it just slightly changes direction
  let rotationAngle;
  if (radiansToDegrees(collisionAngle) <= 90)
    rotationAngle = degreesToRadians(180) - collisionAngle * 2;
  else rotationAngle = (degreesToRadians(180) - collisionAngle) / 2;

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
    rotationAngle = degreesToRadians(180) - collisionAngle * 2;
    circle.vector = {
      x:
        circle.vector.x * Math.cos(rotationAngle) +
        circle.vector.y * Math.sin(rotationAngle),
      y:
        -circle.vector.x * Math.sin(rotationAngle) +
        circle.vector.y * Math.cos(rotationAngle),
    };
  }

  let distanceBetweenCircles = pointsDistance(
    { x: circle.x, y: circle.y },
    { x: collidedCircle.x, y: collidedCircle.y }
  );
  let overlappingDepth = circle.r + collidedCircle.r - distanceBetweenCircles;
  let newPosition = {
    x: circle.x - pointOfContactVector.x * overlappingDepth + circle.vector.x,
    y: circle.y - pointOfContactVector.y * overlappingDepth + circle.vector.y,
  };

  return newPosition;
};

// Draw all the objects
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
        ctx.beginPath();
        ctx.rect(obj.x, obj.y, obj.width, obj.height);
        ctx.stroke();
        ctx.fill();

        break;
    }
  });

  if (stats === true) {
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
          const closestCircle = findClosestCircle(obj);
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
          let circle, closestPoint, distance;
          ({ circle, closestPoint, distance } = objects.reduce((prev, curr) => {
            if (curr.type === "rectangle") return prev;

            let closestPoint = {x: Math.max(obj.x, Math.min(curr.x, obj.x + obj.width)), 
                                y: Math.max(obj.y, Math.min(curr.y, obj.y + obj.height))};
            

            let vectorToClosestPoint = {x: closestPoint.x - curr.x,
                                        y: closestPoint.y - curr.y};

            let distance = vectorLength(vectorToClosestPoint);

            if (prev.distance < 0 || distance < prev.distance) {
              return {circle: curr, closestPoint, distance}
            }

            return prev;

          }, {circle: {}, closestPoint: {}, distance: -1}));

          if (circle) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(circle.x, circle.y);
            ctx.lineTo(
              closestPoint.x,
              closestPoint.y,
            );
            ctx.stroke();
          }
          
          break;
      }
    });
  }
};

const updatePosition = () => {
  if (pause) return;

  objects = objects.map((obj) => {
    let newPosition = { x: obj.x + obj.vector.x, y: obj.y + obj.vector.y };

    switch (obj.type) {
      case "circle":
        if (
          newPosition.x < obj.r ||
          newPosition.x > document.body.offsetWidth - obj.r
        ) {
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

        const collidedObj = objects.find((o) => {
          if (o === obj) return false;

          if (o.type === "circle") {
            if (
              pointsDistance({ x: o.x, y: o.y }, { x: obj.x, y: obj.y }) <=
              o.r + obj.r
            )
              return true;
          } else if (o.type === "rectangle") {
            let closestPoint = {x: Math.max(o.x, Math.min(obj.x, o.x + o.width)), 
                                y: Math.max(o.y, Math.min(obj.y, o.y + o.height))}

            return false;
          }
        });

        if (collidedObj?.type === "circle") {
          let collidedCircle = collidedObj;

          if (collidedCircle) {
            newPosition = calculateNewCirclePosition(obj, collidedCircle);

            newPositionCollidedCircle = calculateNewCirclePosition(
              collidedCircle,
              obj
            );
            collidedCircle.x = newPositionCollidedCircle.x;
            collidedCircle.y = newPositionCollidedCircle.y;
          }

          break;
        } else if (collidedObj?.type === "rectangle") {
          let collidedRectangle = collidedObj;

        }
      case "rectangle":
        break;
    }

    let updatedObject = {};
    switch (obj.type) {
      case "circle":
        updatedObject = {
          type: obj.type,
          x: newPosition.x,
          y: newPosition.y,
          vector: { x: obj.vector.x, y: obj.vector.y },
          r: obj.r,
        };
        break;
      case "rectangle":
        updatedObject = {
          type: obj.type,
          x: newPosition.x,
          y: newPosition.y,
          width: obj.width,
          height: obj.height,
          vector: { x: obj.vector.x, y: obj.vector.y },
          drawing: obj.drawing,
        };
        break;
    }

    return updatedObject;
  });
};

window.onload = (e) => {
  // Cursor coordinates to track mouse position
  let cursorX = 0;
  let cursorY = 0;

  const spanCursorX = document.getElementById("x-mouse");
  const spanCursorY = document.getElementById("y-mouse");

  canvas.width = document.body.offsetWidth;
  canvas.height = document.body.offsetHeight;

  let drawnRect = {};

  setInterval(() => {
    drawFrame();
  }, 40);

  setInterval(() => {
    updatePosition();
  }, 25);

  window.addEventListener("mousemove", (e) => {
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
    if (drawnRect) {
      drawnRect.width = cursorX - drawnRect.x;
      drawnRect.height = cursorY - drawnRect.y;
    }
  });

  window.addEventListener("keydown", (e) => {
    switch (e.code) {
      case "KeyC":
        objects.push({
          type: "circle",
          x: cursorX,
          y: cursorY,
          vector: randomNormalizedVector(),
          r: 30,
        });
        break;
      case "KeyS":
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
          drawnRect = objects.find((obj) => {
            if (obj.type === "rectangle" && obj.drawing) {
              return true;
            } else return false;
          });
        }
        break;
      case "KeyT":
        stats = !stats;
        break;
      case "KeyP":
        pause = !pause;
      default:
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.code) {
      case "KeyS":
        drawnRect = objects.find((obj) => {
          if (obj.type === "rectangle" && obj.drawing) {
            return true;
          } else return false;
        });
        drawnRect.drawing = false;
        break;
    }
  });
};
