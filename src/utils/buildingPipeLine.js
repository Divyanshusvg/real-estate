const buildPipeline = (matchCondition,lat, long, radius ) => {
    // Base pipeline stages
    console.log(matchCondition)
    const pipeline = [
      { $match: matchCondition },
      { $project: { __v: 0 } },
      {
        $lookup: {
          from: "users",
          localField: "ownerId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $lookup: {
          from: "proptypes",
          localField: "propertyType",
          foreignField: "_id",
          as: "propertyDetails",
        },
      },
    ];

    // Conditionally add the $geoNear stage
    if (lat && long) {
      pipeline.unshift({
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lat), parseFloat(long)],
          },
          distanceField: "distance",
          maxDistance: radius * 1000, // Radius in meters
          spherical: true,
        },
      });
    }
    return pipeline;
  };



  export { buildPipeline }